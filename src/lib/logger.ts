type LogLevel = "info" | "warn" | "error"

interface LogEntry {
  level: LogLevel
  msg: string
  [key: string]: unknown
}

function log(level: LogLevel, msg: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = { level, msg, ts: new Date().toISOString(), ...context }
  if (level === "error") {
    console.error(JSON.stringify(entry))
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry))
  } else {
    console.log(JSON.stringify(entry))
  }
}

export const logger = {
  info: (msg: string, context?: Record<string, unknown>) => log("info", msg, context),
  warn: (msg: string, context?: Record<string, unknown>) => log("warn", msg, context),
  error: (msg: string, context?: Record<string, unknown>) => log("error", msg, context),
}
