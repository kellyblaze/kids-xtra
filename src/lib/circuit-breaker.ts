// In-memory circuit breaker. State resets on cold starts (serverless).
// For persistent state across invocations, back this with a DB table.

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN"

interface CircuitData {
  state: CircuitState
  failureCount: number
  lastFailureAt: number
  successCount: number
}

export interface CircuitBreakerOptions {
  failureThreshold?: number
  successThreshold?: number
  resetTimeoutMs?: number
}

const circuits = new Map<string, CircuitData>()

function getCircuit(name: string): CircuitData {
  if (!circuits.has(name)) {
    circuits.set(name, { state: "CLOSED", failureCount: 0, lastFailureAt: 0, successCount: 0 })
  }
  return circuits.get(name)!
}

export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  options: CircuitBreakerOptions = {},
): Promise<T> {
  const failureThreshold = options.failureThreshold ?? 5
  const successThreshold = options.successThreshold ?? 2
  const resetTimeoutMs = options.resetTimeoutMs ?? 30_000

  const circuit = getCircuit(name)

  if (circuit.state === "OPEN") {
    if (Date.now() - circuit.lastFailureAt < resetTimeoutMs) {
      throw new Error(`Circuit breaker OPEN for "${name}" — service unavailable`)
    }
    circuit.state = "HALF_OPEN"
    circuit.successCount = 0
  }

  try {
    const result = await fn()
    onSuccess(circuit, successThreshold)
    return result
  } catch (err) {
    onFailure(circuit, failureThreshold)
    throw err
  }
}

function onSuccess(circuit: CircuitData, successThreshold: number): void {
  circuit.failureCount = 0
  if (circuit.state === "HALF_OPEN") {
    circuit.successCount += 1
    if (circuit.successCount >= successThreshold) {
      circuit.state = "CLOSED"
    }
  }
}

function onFailure(circuit: CircuitData, failureThreshold: number): void {
  circuit.failureCount += 1
  circuit.lastFailureAt = Date.now()
  if (circuit.state === "HALF_OPEN" || circuit.failureCount >= failureThreshold) {
    circuit.state = "OPEN"
  }
}

export function getCircuitState(name: string): CircuitState {
  return getCircuit(name).state
}

export function resetCircuit(name: string): void {
  circuits.delete(name)
}
