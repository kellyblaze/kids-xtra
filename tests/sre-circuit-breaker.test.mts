import test from "node:test";
import assert from "node:assert/strict";
import {
  withCircuitBreaker,
  getCircuitState,
  resetCircuit,
} from "../src/lib/circuit-breaker.ts";

const NAME = "test-circuit";

function reset() { resetCircuit(NAME); }

test("circuit starts CLOSED and passes through on success", async () => {
  reset();
  const result = await withCircuitBreaker(NAME, async () => "ok");
  assert.equal(result, "ok");
  assert.equal(getCircuitState(NAME), "CLOSED");
  reset();
});

test("circuit opens after failureThreshold consecutive failures", async () => {
  reset();
  const opts = { failureThreshold: 3, resetTimeoutMs: 60_000 };
  for (let i = 0; i < 3; i++) {
    await assert.rejects(() =>
      withCircuitBreaker(NAME, async () => { throw new Error("fail"); }, opts),
    );
  }
  assert.equal(getCircuitState(NAME), "OPEN");
  reset();
});

test("OPEN circuit rejects immediately without calling fn", async () => {
  reset();
  const opts = { failureThreshold: 1, resetTimeoutMs: 60_000 };
  await assert.rejects(() =>
    withCircuitBreaker(NAME, async () => { throw new Error("fail"); }, opts),
  );
  assert.equal(getCircuitState(NAME), "OPEN");

  let called = false;
  await assert.rejects(
    () => withCircuitBreaker(NAME, async () => { called = true; return "x"; }, opts),
    /Circuit breaker OPEN/,
  );
  assert.equal(called, false);
  reset();
});

test("OPEN circuit transitions to HALF_OPEN after resetTimeout elapses", async () => {
  reset();
  const opts = { failureThreshold: 1, resetTimeoutMs: 0 };
  await assert.rejects(() =>
    withCircuitBreaker(NAME, async () => { throw new Error("fail"); }, opts),
  );
  assert.equal(getCircuitState(NAME), "OPEN");

  // resetTimeoutMs=0 → condition Date.now()-lastFailureAt < 0 is always false → transitions
  const result = await withCircuitBreaker(NAME, async () => "probe", opts);
  assert.equal(result, "probe");
  assert.equal(getCircuitState(NAME), "HALF_OPEN");
  reset();
});

test("HALF_OPEN circuit closes after successThreshold successes", async () => {
  reset();
  const opts = { failureThreshold: 1, resetTimeoutMs: 0, successThreshold: 2 };
  await assert.rejects(() =>
    withCircuitBreaker(NAME, async () => { throw new Error("fail"); }, opts),
  );

  await withCircuitBreaker(NAME, async () => "probe1", opts);
  assert.equal(getCircuitState(NAME), "HALF_OPEN");

  await withCircuitBreaker(NAME, async () => "probe2", opts);
  assert.equal(getCircuitState(NAME), "CLOSED");
  reset();
});

test("HALF_OPEN circuit reopens on failure", async () => {
  reset();
  const opts = { failureThreshold: 1, resetTimeoutMs: 0, successThreshold: 5 };
  await assert.rejects(() =>
    withCircuitBreaker(NAME, async () => { throw new Error("fail"); }, opts),
  );

  await assert.rejects(() =>
    withCircuitBreaker(NAME, async () => { throw new Error("probe fail"); }, opts),
  );
  assert.equal(getCircuitState(NAME), "OPEN");
  reset();
});

test("resetCircuit clears state to CLOSED", async () => {
  reset();
  const opts = { failureThreshold: 1, resetTimeoutMs: 60_000 };
  await assert.rejects(() =>
    withCircuitBreaker(NAME, async () => { throw new Error("fail"); }, opts),
  );
  assert.equal(getCircuitState(NAME), "OPEN");

  resetCircuit(NAME);
  assert.equal(getCircuitState(NAME), "CLOSED");
  reset();
});
