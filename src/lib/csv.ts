const FORMULA_CHARS = /^[=+\-@\t\r]/

function escapeCell(value: string): string {
  const str = String(value)
  const safeStr = FORMULA_CHARS.test(str) ? `'${str}` : str
  const needsQuote = safeStr.includes(",") || safeStr.includes('"') || safeStr.includes("\n") || safeStr.includes("\r")
  if (needsQuote) return `"${safeStr.replace(/"/g, '""')}"`
  return safeStr
}

export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ]
  return lines.join("\r\n")
}
