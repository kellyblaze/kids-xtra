import { createHmac } from "crypto"

const SECRET = process.env.KID_SESSION_SECRET ?? "fallback-dev-secret"

export interface KidSession {
  childId: string
  familyId: string
  childName: string
}

export function signKidSession(payload: KidSession): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const sig = createHmac("sha256", SECRET).update(encoded).digest("base64url")
  return `${encoded}.${sig}`
}

export function verifyKidSession(token: string): KidSession | null {
  try {
    const dot = token.lastIndexOf(".")
    if (dot === -1) return null
    const encoded = token.slice(0, dot)
    const sig = token.slice(dot + 1)
    const expected = createHmac("sha256", SECRET).update(encoded).digest("base64url")
    if (sig !== expected) return null
    return JSON.parse(Buffer.from(encoded, "base64url").toString()) as KidSession
  } catch {
    return null
  }
}

export function hashPin(pin: string): string {
  return createHmac("sha256", SECRET).update(pin).digest("hex")
}
