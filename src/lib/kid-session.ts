// Uses Web Crypto API — compatible with both Node.js and Edge Runtime

const SECRET = process.env.KID_SESSION_SECRET ?? "fallback-dev-secret"
const enc = new TextEncoder()

export interface KidSession {
  childId: string
  familyId: string
  childName: string
}

async function getKey(usage: KeyUsage[]): Promise<CryptoKey> {
  const keyData = enc.encode(SECRET)
  return crypto.subtle.importKey(
    "raw", keyData,
    { name: "HMAC", hash: "SHA-256" },
    false, usage
  )
}

function toBase64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64url(str: string): ArrayBuffer {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/")
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer
}

export async function signKidSession(payload: KidSession): Promise<string> {
  const encoded = toBase64url(enc.encode(JSON.stringify(payload)).buffer as ArrayBuffer)
  const key = await getKey(["sign"])
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(encoded).buffer as ArrayBuffer)
  return `${encoded}.${toBase64url(sig)}`
}

export async function verifyKidSession(token: string): Promise<KidSession | null> {
  try {
    const dot = token.lastIndexOf(".")
    if (dot === -1) return null
    const encoded = token.slice(0, dot)
    const sig = token.slice(dot + 1)
    const key = await getKey(["verify"])
    const valid = await crypto.subtle.verify("HMAC", key, fromBase64url(sig), enc.encode(encoded).buffer as ArrayBuffer)
    if (!valid) return null
    return JSON.parse(new TextDecoder().decode(fromBase64url(encoded))) as KidSession
  } catch {
    return null
  }
}

export async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(SECRET + pin).buffer as ArrayBuffer)
  return toBase64url(buf)
}
