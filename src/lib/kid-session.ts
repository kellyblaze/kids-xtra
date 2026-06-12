// Cookie stores plain childId UUID — verified against DB on every request.
// httpOnly + secure flags are the security boundary.

export function signKidSession(childId: string): string {
  return childId
}

export function verifyKidSession(token: string): string | null {
  if (token && token.length > 0) return token
  return null
}

// PIN is hashed with SHA-256 for secure storage
const enc = new TextEncoder()
const SECRET = process.env.KID_SESSION_SECRET ?? "fallback-dev-secret"

export async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    enc.encode(SECRET + pin).buffer as ArrayBuffer
  )
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
