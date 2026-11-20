# KidsXtra Security Test Cases

**Date:** 2026-11-20
**Standard:** OWASP ASVS 5.0 Level 2
**Environment:** Staging/local only. Use synthetic test accounts. Never use real children's data.

---

## Test Setup

```typescript
// tests/security/setup.ts
// Seed a test family with two parents and two children using test-only credentials.
// All test accounts should use email pattern: test+*@example.com (blocked in production by email allowlist).
```

---

## 1. Authentication Tests

### ST-AUTH-01: Kid PIN brute force is rate-limited

**Finding:** F-03 (also validates existing kid-login rate limit)
**Method:** Integration test hitting /api/kid-login

```typescript
it('blocks kid PIN after 5 failed attempts', async () => {
  const childId = TEST_CHILD_ID
  for (let i = 0; i < 5; i++) {
    await fetch('/api/kid-login', {
      method: 'POST',
      body: JSON.stringify({ childId, pin: '0000' }),
    })
  }
  const res = await fetch('/api/kid-login', {
    method: 'POST',
    body: JSON.stringify({ childId, pin: TEST_CHILD_PIN }),
  })
  expect(res.status).toBe(429)
})
```

---

### ST-AUTH-02: Kid session cookie is rejected after expiry

**Finding:** F-01 (session management)
**Method:** Integration test

```typescript
it('rejects an expired kid session cookie', async () => {
  // Craft a valid HMAC token with expiry in the past
  const expiredToken = await craftKidToken(TEST_CHILD_ID, Date.now() - 1000)
  const res = await fetch('/api/kid-session/refresh', {
    headers: { Cookie: `kid-session=${expiredToken}` },
  })
  expect(res.status).toBe(401)
})
```

---

### ST-AUTH-03: Tampered kid session cookie is rejected

**Finding:** F-01 (HMAC verification)
**Method:** Integration test

```typescript
it('rejects a tampered kid session signature', async () => {
  const validToken = await issueKidToken(TEST_CHILD_ID)
  const [id, exp, _sig] = validToken.split('.')
  const tamperedToken = [id, exp, 'invalidsignature'].join('.')
  const res = await fetch('/api/chore-completions', {
    headers: { Cookie: `kid-session=${tamperedToken}` },
  })
  expect(res.status).toBe(401)
})
```

---

### ST-AUTH-04: Parent JWT session redirects to login when expired

**Finding:** F-01 (missing middleware)
**Method:** E2E (Playwright)

```typescript
test('expired parent JWT redirects to login', async ({ page, context }) => {
  await loginAsParent(page)
  // Expire the session cookie by clearing Supabase auth cookies
  await context.clearCookies()
  await page.goto('/parent/dashboard')
  await expect(page).toHaveURL('/auth/login')
})
```

---

## 2. Authorization Tests

### ST-AUTHZ-01: Child cannot access another family's chore

**Finding:** BOLA prevention (family isolation)
**Method:** Integration test

```typescript
it('returns 403 when child accesses chore from different family', async () => {
  const kidToken = await issueKidToken(FAMILY_A_CHILD_ID)
  const res = await fetch(`/api/chore-completions`, {
    method: 'POST',
    headers: { Cookie: `kid-session=${kidToken}` },
    body: JSON.stringify({ assignmentId: FAMILY_B_ASSIGNMENT_ID }),
  })
  expect(res.status).toBe(403)
})
```

---

### ST-AUTHZ-02: Parent cannot approve another family's chore completion

**Finding:** Family isolation in approveChoreCompletion
**Method:** Integration test

```typescript
it('returns error when parent approves completion from different family', async () => {
  await loginAsParent(FAMILY_A_PARENT)
  const result = await approveChoreCompletion(FAMILY_B_COMPLETION_ID)
  expect(result.error).toBeDefined()
  // Confirm completion status unchanged in DB
  const { data } = await supabase.from('chore_completions').select('status').eq('id', FAMILY_B_COMPLETION_ID).single()
  expect(data.status).toBe('pending_approval')
})
```

---

### ST-AUTHZ-03: Child cannot approve their own chore completion

**Finding:** Role separation (child vs parent operations)
**Method:** Integration test

```typescript
it('child session cannot call approveChoreCompletion server action', async () => {
  // Server actions check auth.getUser() which returns null for child cookie sessions
  const res = await fetch('/api/approval', {
    method: 'POST',
    headers: { Cookie: `kid-session=${KID_TOKEN}` },
    body: JSON.stringify({ completionId: OWN_COMPLETION_ID }),
  })
  // Should be 401 or redirect, not 200
  expect(res.status).not.toBe(200)
})
```

---

### ST-AUTHZ-04: Chore photo path traversal is blocked

**Finding:** Photo proxy path validation
**Method:** Integration test

```typescript
it('rejects photo path with directory traversal', async () => {
  const maliciousPaths = [
    '../other-family/child/photo.jpg',
    '../../secrets',
    `${FAMILY_A_ID}/../${FAMILY_B_ID}/photo.jpg`,
  ]
  for (const path of maliciousPaths) {
    const res = await fetch(`/api/chore-photo?path=${encodeURIComponent(path)}`, {
      headers: { Cookie: `parent-session=${PARENT_TOKEN}` },
    })
    expect(res.status).toBe(403)
  }
})
```

---

## 3. Input Validation Tests

### ST-INPUT-01: Photo upload rejects non-image files

**Finding:** Magic-byte validation (documented as passing)
**Method:** Integration test

```typescript
it('rejects file with image MIME type but non-image content', async () => {
  const fakeImage = Buffer.from('<script>alert(1)</script>')
  const form = new FormData()
  form.append('photo', new Blob([fakeImage], { type: 'image/jpeg' }), 'evil.jpg')
  const res = await fetch('/api/kid-upload-photo', {
    method: 'POST',
    headers: { Cookie: `kid-session=${KID_TOKEN}` },
    body: form,
  })
  expect(res.status).toBe(400)
})
```

---

### ST-INPUT-02: Photo upload enforces 5MB size limit

**Finding:** File size validation
**Method:** Integration test

```typescript
it('rejects photo larger than 5MB', async () => {
  const bigFile = Buffer.alloc(5 * 1024 * 1024 + 1)
  const form = new FormData()
  form.append('photo', new Blob([bigFile], { type: 'image/jpeg' }), 'big.jpg')
  const res = await fetch('/api/kid-upload-photo', {
    method: 'POST',
    headers: { Cookie: `kid-session=${KID_TOKEN}` },
    body: form,
  })
  expect(res.status).toBe(400)
})
```

---

### ST-INPUT-03: Bonus credits amount is clamped to 1-500

**Finding:** awardBonusCredits validation
**Method:** Unit test

```typescript
it('rejects bonus credit award outside 1-500 range', async () => {
  expect(await awardBonusCredits(CHILD_ID, 0, 'test')).toMatchObject({ error: expect.any(String) })
  expect(await awardBonusCredits(CHILD_ID, 501, 'test')).toMatchObject({ error: expect.any(String) })
  expect(await awardBonusCredits(CHILD_ID, -1, 'test')).toMatchObject({ error: expect.any(String) })
})
```

---

## 4. Financial Integrity Tests

### ST-FIN-01: Reward redemption fails when balance is insufficient

**Finding:** approve_reward_redemption atomicity
**Method:** Integration test

```typescript
it('denies redemption when child has insufficient credits', async () => {
  // Set up child with 10 credits, reward costs 100
  const result = await approveRewardRedemption(EXPENSIVE_REWARD_REDEMPTION_ID)
  expect(result.error).toMatch(/insufficient/i)
  // Confirm no debit transaction was inserted
  const { count } = await supabase.from('credit_transactions').select('*', { count: 'exact' }).eq('reference_id', EXPENSIVE_REWARD_REDEMPTION_ID)
  expect(count).toBe(0)
})
```

---

### ST-FIN-02: Double-approval of same redemption is idempotent

**Finding:** approve_reward_redemption status guard
**Method:** Integration test

```typescript
it('second approval of same redemption returns error without double-debit', async () => {
  const balanceBefore = await getChildBalance(CHILD_ID)
  await approveRewardRedemption(REDEMPTION_ID)
  const result = await approveRewardRedemption(REDEMPTION_ID)
  expect(result.error).toBeDefined()
  const balanceAfter = await getChildBalance(CHILD_ID)
  expect(balanceBefore - balanceAfter).toBe(REWARD_COST) // debited exactly once
})
```

---

## 5. Rate Limit Tests

### ST-RATE-01: Photo upload is rate-limited per child (P1 fix)

**Note:** This test will FAIL until F-03 fix is applied.

```typescript
it('blocks photo upload after 20 requests per hour', async () => {
  for (let i = 0; i < 20; i++) {
    await uploadTestPhoto(KID_TOKEN)
  }
  const res = await uploadTestPhoto(KID_TOKEN)
  expect(res.status).toBe(429)
})
```

---

### ST-RATE-02: Parent login is rate-limited per IP (P1 fix)

**Note:** This test will FAIL until F-09 fix is applied.

```typescript
it('blocks parent login after 10 failed attempts per IP', async () => {
  for (let i = 0; i < 10; i++) {
    await signIn('parent@example.com', 'wrongpassword')
  }
  const res = await signIn('parent@example.com', CORRECT_PASSWORD)
  expect(res.error).toMatch(/rate limit/i)
})
```

---

## 6. CSP / Header Tests

### ST-HDR-01: Security headers are present on all responses

**Finding:** F-11 (and validates existing headers)
**Method:** Integration test

```typescript
it('includes required security headers on HTML responses', async () => {
  const res = await fetch('/')
  const h = res.headers
  expect(h.get('X-Content-Type-Options')).toBe('nosniff')
  expect(h.get('X-Frame-Options')).toBe('DENY')
  expect(h.get('Strict-Transport-Security')).toMatch(/max-age/)
  expect(h.get('Cross-Origin-Opener-Policy')).toBe('same-origin') // fails until F-11 fixed
  expect(h.get('Cross-Origin-Resource-Policy')).toBe('same-origin') // fails until F-11 fixed
})
```

---

### ST-HDR-02: CSP does not contain unsafe-inline in script-src (P2 fix)

**Note:** This test will FAIL until F-02 fix is applied.

```typescript
it('CSP script-src does not contain unsafe-inline', async () => {
  const res = await fetch('/')
  const csp = res.headers.get('Content-Security-Policy') || ''
  const scriptSrc = csp.split(';').find(d => d.trim().startsWith('script-src'))
  expect(scriptSrc).not.toContain("'unsafe-inline'")
})
```

---

## 7. AI Safety Tests

### ST-AI-01: Child name is never sent to Anthropic API

**Finding:** AI data minimization (documented as passing)
**Method:** Unit test with spy

```typescript
it('does not include child name in Anthropic API request', async () => {
  const spy = jest.spyOn(global, 'fetch')
  await generateXtraCoachPlan({ childAge: 8, goal: 'do homework', existingTitles: [], familyId: FAMILY_ID })
  const anthropicCall = spy.mock.calls.find(([url]) => String(url).includes('anthropic'))
  const body = JSON.parse(anthropicCall[1].body)
  const promptText = body.messages.map((m: any) => m.content).join(' ')
  expect(promptText).not.toContain(TEST_CHILD_NAME)
})
```

---

## 8. CSRF Tests

### ST-CSRF-01: API routes reject requests without matching Origin

**Finding:** isSameOriginRequest validation
**Method:** Integration test

```typescript
it('rejects POST to API route with cross-origin Origin header', async () => {
  const res = await fetch('/api/kid-login', {
    method: 'POST',
    headers: { Origin: 'https://evil.com', 'Content-Type': 'application/json' },
    body: JSON.stringify({ childId: TEST_CHILD_ID, pin: '0000' }),
  })
  expect(res.status).toBe(403)
})
```

---

## Running the Tests

```bash
# Unit and integration tests
npx vitest run tests/security/

# E2E tests (requires running dev server)
npx playwright test tests/security/e2e/

# Run only tests that should pass NOW (before fixes)
npx vitest run tests/security/ --reporter=verbose

# Run ALL tests including expected-fail tests for P1+ fixes
npx vitest run tests/security/ --reporter=verbose --no-bail
```

---

## Test Maintenance

- Tests marked "will FAIL until Fx fix" should be tracked in the fix plan.
- After each fix is implemented, verify the corresponding test now passes.
- Never modify a test to pass for a fix that has not been implemented.
