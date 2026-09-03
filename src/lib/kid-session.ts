const enc = new TextEncoder()

function getSecret(): string {
  const secret = process.env.KID_SESSION_SECRET
  if (!secret) throw new Error("KID_SESSION_SECRET is not configured")
  return secret
}

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=")
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

async function getSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  )
}

export async function signKidSession(childId: string): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
  const payload = `${childId}.${expiresAt}`
  const signature = await crypto.subtle.sign("HMAC", await getSigningKey(), enc.encode(payload))
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`
}

export async function verifyKidSession(token: string): Promise<string | null> {
  const [childId, expiresAtRaw, signatureRaw, ...extra] = token.split(".")
  if (!childId || !expiresAtRaw || !signatureRaw || extra.length > 0) return null

  const expiresAt = Number(expiresAtRaw)
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getSigningKey(),
      fromBase64Url(signatureRaw),
      enc.encode(`${childId}.${expiresAtRaw}`),
    )
    return valid ? childId : null
  } catch {
    return null
  }
}

export async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    enc.encode(getSecret() + pin).buffer as ArrayBuffer
  )
  return toBase64Url(new Uint8Array(buf))
}
