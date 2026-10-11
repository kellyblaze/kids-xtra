import test from "node:test"
import assert from "node:assert/strict"

process.env.KID_SESSION_SECRET = "test-secret-with-enough-length"

const {
  getKidSessionExpiry,
  signKidSession,
  verifyKidSession,
} = await import("../src/lib/kid-session.ts")

test("kid session signs a child id and exposes expiry", async () => {
  const token = await signKidSession("child-123", 60)

  assert.equal(await verifyKidSession(token), "child-123")

  const expiresAt = await getKidSessionExpiry(token)
  assert.equal(typeof expiresAt, "number")
  assert.ok((expiresAt ?? 0) > Math.floor(Date.now() / 1000))
})

test("kid session rejects tampered tokens", async () => {
  const token = await signKidSession("child-123", 60)
  const tampered = token.replace("child-123", "child-456")

  assert.equal(await verifyKidSession(tampered), null)
  assert.equal(await getKidSessionExpiry(`${token}.extra`), null)
})
