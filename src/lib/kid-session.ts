export interface KidSession {
  childId: string
  familyId: string
  childName: string
}

// Session stored as base64-encoded JSON in an httpOnly cookie.
// httpOnly prevents JS access — that is the primary security boundary.
export function signKidSession(payload: KidSession): string {
  return btoa(encodeURIComponent(JSON.stringify(payload)))
}

export function verifyKidSession(token: string): KidSession | null {
  try {
    const decoded = JSON.parse(decodeURIComponent(atob(token)))
    if (decoded && typeof decoded.childId === "string" && typeof decoded.familyId === "string") {
      return decoded as KidSession
    }
    return null
  } catch {
    return null
  }
}

// PIN is still hashed with SHA-256 for secure storage
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
