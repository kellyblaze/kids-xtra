# KidsXtra Security Fix Plan

**Date:** 2026-11-20
**Based on:** SECURITY_AUDIT.md, VULNERABILITY_REGISTER.md, COPPA_GAP_ANALYSIS.md
**Constraint:** Read-only audit complete. Fixes may now be implemented in priority order.

---

## Prioritization Legend

| Priority | Criteria |
|----------|---------|
| P0 — Block launch | Critical security or compliance gap; app should not go live without this |
| P1 — Pre-GA | Should be fixed before general availability; significant risk if not |
| P2 — Post-launch sprint | Fix within 30 days of launch; moderate risk |
| P3 — Hardening | Fix within 90 days; low risk but good hygiene |

---

## P0 — Block Launch

### P0-1: Create src/middleware.ts (F-01)

**Risk:** Parent JWT sessions never refresh; no server-enforced route guard.
**Effort:** 30 min
**Files to create:** src/middleware.ts

Implementation steps:
1. Create src/middleware.ts using Supabase SSR createServerClient + updateSession pattern.
2. Add matcher config protecting /parent/:path* and /kid/:path* routes.
3. Test: sign in, let JWT expire, navigate to /parent/dashboard — should redirect to /auth/login, not throw.

```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        } } }
  )
  await supabase.auth.getUser()
  return supabaseResponse
}

export const config = {
  matcher: ['/parent/:path*', '/kid/:path*'],
}
```

---

### P0-2: Publish Privacy Policy (F-12 + COPPA 312.4)

**Risk:** App Store rejection; FTC enforcement exposure.
**Effort:** Legal + 2 hrs dev
**Files to create:** src/app/privacy/page.tsx, src/app/terms/page.tsx

Implementation steps:
1. Engage legal counsel to draft Privacy Policy covering: data collected, purpose, third parties (Supabase, Anthropic, Resend, Stripe, Vercel), retention, parent rights, contact.
2. Create /privacy and /terms Next.js pages.
3. Link from sign-up form and app footer.
4. Add privacy policy URL to App Store Connect listing.

---

### P0-3: Implement Verifiable Parental Consent (F-04 + COPPA 312.5)

**Risk:** COPPA violation; FTC fines up to $51,744 per violation per child.
**Effort:** 2-3 days (depends on consent method chosen)
**Files to modify:** src/app/actions/auth.ts, database migrations

Implementation steps:
1. Add parental_consents table migration (family_id, consent_method, consent_timestamp, policy_version, ip_hash).
2. After signUp, gate child profile creation behind consent flow.
3. Implement consent method (recommended: Stripe micro-charge of $0.01 with immediate refund — verifies credit card ownership, logged).
4. Store consent record on successful verification.
5. Display consent status in parent settings with option to revoke (triggers account deletion flow).

---

## P1 — Pre-GA

### P1-1: Add server-only guard to createAdminClient (F-07)

**Risk:** Service role key accidentally bundled in client JS.
**Effort:** 5 min
**File:** src/lib/supabase/admin.ts, line 1

Add as the first line:
```typescript
import "server-only"
```

---

### P1-2: Scope kid session cookie to /kid path (F-08)

**Risk:** Cookie sent on every request including parent routes.
**Effort:** 15 min
**Files:** src/app/api/kid-login/route.ts:94, src/app/api/kid-session/refresh/route.ts:30

Change path: "/" to path: "/kid" in both cookie set calls.

---

### P1-3: Add rate limits to unprotected endpoints (F-03)

**Risk:** Photo upload flood, push subscription abuse.
**Effort:** 2 hrs
**Files:** 
- src/app/api/kid-upload-photo/route.ts
- src/app/api/push/subscribe/route.ts
- src/app/api/push/kid-subscribe/route.ts
- src/app/api/kid-session/refresh/route.ts

Add consumeRateLimit call at the top of each handler:
- Photo upload: 20/hr per child_id
- Push subscribe: 10/hr per user_id
- Session refresh: 60/hr per child_id

---

### P1-4: Add application-layer rate limit to parent login (F-09)

**Risk:** Brute-force on parent account falls back to Supabase limits alone.
**Effort:** 30 min
**File:** src/app/actions/auth.ts signIn function

Add consumeRateLimit (10 attempts / 15 min per IP) before signInWithPassword.

---

### P1-5: Replace child_name in activity_logs.metadata with child_id (F-06)

**Risk:** Child names persist indefinitely in logs; undisclosed retention of PII.
**Effort:** 2 hrs
**Files:** 
- src/app/actions/reward-actions.ts (awardBonusCredits)
- src/app/actions/approval-actions.ts
- src/app/actions/completion-actions.ts

Replace child_name: child.name with child_id: child.id in all metadata objects. Resolve display names at read time in the parent dashboard.

---

## P2 — Post-Launch Sprint (within 30 days)

### P2-1: Replace unsafe-inline CSP with nonce-based CSP (F-02)

**Risk:** Inline script injection executes unrestricted if XSS is found later.
**Effort:** 4 hrs
**File:** next.config.ts, src/middleware.ts (once created)

Steps:
1. Generate a cryptographic nonce in middleware per request.
2. Pass nonce to Next.js via response header.
3. Replace 'unsafe-inline' with 'nonce-{nonce}' in script-src.
4. Verify no inline scripts break (Next.js adds nonce to its own scripts automatically).

---

### P2-2: Add COOP and CORP headers (F-11)

**Risk:** Cross-origin exploitation of popup context.
**Effort:** 15 min
**File:** next.config.ts headers() array

Add:
- Cross-Origin-Opener-Policy: same-origin
- Cross-Origin-Resource-Policy: same-origin

---

### P2-3: Implement data retention schedule (F-05 + COPPA 312.10)

**Risk:** Indefinite retention of children's data violates COPPA.
**Effort:** 4 hrs
**Files:** src/app/api/tasks/ (new cron handler)

Steps:
1. Define retention policy: soft-deleted child profiles hard-deleted after 90 days; activity_logs older than 1 year purged.
2. Create src/app/api/tasks/purge-expired-data/route.ts cron handler.
3. Add Vercel cron schedule in vercel.json.
4. Implement storage bucket cleanup: delete photos under {familyId}/{childId}/ when child profile is hard-deleted.

---

### P2-4: Create .env.example (F-10)

**Effort:** 20 min
**Files to create:** .env.example

Document all required environment variables with descriptions and placeholder values. Mark which are NEXT_PUBLIC_ (safe to expose) vs server-only.

---

## P3 — Hardening (within 90 days)

### P3-1: Verify RLS on child_streaks and migration-0012 tables

**Risk:** Potential cross-family read of push subscriptions or streak data.
**Effort:** 30 min

Verify in Supabase dashboard that RLS is enabled on:
- child_streaks
- push_subscriptions
- push_subscription_recipients
- mission_progress
- mission_reminder_deliveries

If not enabled, apply the policies documented in SUPABASE_RLS_AUDIT.md.

---

### P3-2: Structured logging

**Effort:** 1 day
**Risk:** console.error statements provide no structured observability.

Replace console.error with a structured logger (e.g., Pino) that includes request ID, family ID (not child name), and severity.

---

### P3-3: Password policy enforcement

**Effort:** 30 min

Enforce minimum 8-character password in the sign-up form (Supabase supports custom password policy via auth config).

---

## Fix Tracking

| ID | Finding | Priority | Status |
|----|---------|---------|--------|
| F-01 | Missing middleware.ts | P0 | TODO |
| F-12 | No privacy policy | P0 | TODO |
| F-04 | No verifiable consent | P0 | TODO |
| F-07 | Admin client server-only | P1 | TODO |
| F-08 | Cookie path scoping | P1 | TODO |
| F-03 | Rate limit gaps | P1 | TODO |
| F-09 | Parent login rate limit | P1 | TODO |
| F-06 | Child names in logs | P1 | TODO |
| F-02 | unsafe-inline CSP | P2 | TODO |
| F-11 | Missing COOP/CORP | P2 | TODO |
| F-05 | No retention schedule | P2 | TODO |
| F-10 | No .env.example | P2 | TODO |
| RLS | Unverified tables | P3 | TODO |
