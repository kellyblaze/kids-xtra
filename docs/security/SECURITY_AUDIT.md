# KidsXtra Security Audit

**Standard:** OWASP ASVS 5.0 Level 2  
**Audit Date:** 2026-11-20  
**Auditor:** Automated codebase review (read-only)  
**Scope:** Full codebase, migrations, configuration — no production data accessed

---

## Executive Summary

KidsXtra demonstrates a mature security posture for a consumer children's app. The authentication architecture, database privilege model, and financial integrity controls are well-designed. The most significant gaps are operational (missing session-refresh middleware, weak CSP directive) and child-privacy oriented (no documented COPPA programme, no data-retention policy). No critical authentication bypasses or SQL injection vulnerabilities were found.

**Overall launch-readiness: CONDITIONAL** — the High and Medium issues below must be addressed before general availability.

---

## 1. Authentication

### 1.1 Parent Authentication (Supabase Auth)
**Status: GOOD**

- `signInWithPassword` / `signUp` delegate to Supabase Auth — Supabase handles password hashing (bcrypt), email verification, and JWTs.
- `auth.getUser()` is used consistently in server actions (cryptographic JWT validation, not header trust).
- `resetPasswordForEmail` redirects to `/auth/callback?next=/parent/settings` — the `next` parameter is a fixed string, not user-supplied, so there is no open-redirect risk.
- No password policy is enforced at sign-up beyond Supabase defaults (6-character minimum). Consider enforcing a minimum of 8 characters.

### 1.2 Child Authentication (Custom Cookie)
**Status: GOOD with one concern**

- Token format: `childId.expiresAt.HMAC-SHA256(childId.expiresAt, KID_SESSION_SECRET)`
- `verifyKidSession` uses `crypto.subtle.verify` — constant-time HMAC verification, correct.
- 30-day session expiry with rolling refresh when fewer than `KID_SESSION_RENEW_SECONDS` remain.
- Cookie flags: `httpOnly: true, secure: true (production), sameSite: "lax"` — correct.
- **CONCERN (Medium):** The cookie `path` is `"/"`, meaning it is sent on every request including parent dashboard routes. It is never read in a parent context, but it inflates request headers. Recommend scoping to `path: "/kid"`.

### 1.3 Rate Limiting
**Status: GOOD**

- `consumeRateLimit` uses a PostgreSQL advisory lock pattern (`consume_auth_rate_limit` SECURITY DEFINER RPC).
- IP is taken from `request.ip` (Vercel infrastructure header, not spoofable `x-forwarded-for`) — correct.
- IP address is HMAC-hashed before storage in `auth_rate_limits` — PII-safe.
- Kid PIN: 5 attempts per 15 min per child profile; 20 attempts per 15 min per IP.
- AI actions: 10 per hour per parent user ID — appropriate.
- **GAP:** Parent login (`signInWithPassword`) has no application-layer rate limit — relies solely on Supabase's built-in rate limiting.

### 1.4 Session Management
**Status: CONCERN**

- Parent sessions: Supabase JWT with automatic refresh via SSR middleware cookies — but no `middleware.ts` exists (see F-01).
- Child sessions: short HMAC token with explicit renewal endpoint (`/api/kid-session/refresh`).
- Refresh endpoint validates the existing token before issuing a new one — correct.

---

## 2. Authorization

### 2.1 Parent/Child Role Separation
**Status: STRONG**

- `authorizeChildAccess(childId)` performs a two-path check:
  1. Kid path: verifies HMAC token then confirms child is active in DB.
  2. Parent path: verifies Supabase JWT then confirms `child.family_id === parent.family_id`.
- Returns `{ familyId, isParentSession }` — callers gate parent-only operations (e.g., `mode: "shared"` push subscription requires `isParentSession: true`).

### 2.2 Family Isolation
**Status: STRONG**

- Every server action derives `familyId` from the authenticated user's `parent_profiles` row, never from request input.
- All Supabase queries include `.eq("family_id", ctx.familyId)` as a redundant defence-in-depth filter even where RLS applies.

### 2.3 Broken Object Level Authorization (BOLA)
**Status: GOOD**

- Chore completion: `markChoreComplete` checks `assignment.child_id === childId` AND `assignment.family_id === authorization.familyId`.
- Reward redemption: verifies `reward.family_id === authorization.familyId` AND balance check before inserting.
- Photo upload: path is `{familyId}/{childId}/{uuid}.{ext}` — constructed server-side from verified session, never user-supplied.
- Photo download: `isAuthorizedChorePhotoPath(path, profile.family_id)` validates the path prefix before fetching from storage — also validates against path traversal (`..`) and enforces an allowlist regex.

### 2.4 Privilege Escalation
**Status: STRONG**

- `families` and `parent_profiles` have `REVOKE INSERT, UPDATE, DELETE FROM authenticated` — authenticated users cannot directly modify their own family row or parent profile.
- `recalculate_child_balance`, `award_xp`, `update_child_streak`, and `approve_reward_redemption` are SECURITY DEFINER functions restricted to `service_role` — an authenticated user cannot call them directly via the Supabase PostgREST API.
- Migration 0007 includes a self-verification `DO $$` block that raises an exception if privileges are not revoked — prevents silent misconfiguration.

---

## 3. Supabase Configuration

### 3.1 Row Level Security
**Status: GOOD**

- RLS enabled and `FORCE ROW LEVEL SECURITY` set on all tables.
- `my_family_id()` helper function (STABLE, SECURITY DEFINER, `search_path` locked) used in all policies.
- `auth_rate_limits` has all permissions revoked from anon and authenticated — only callable via RPC.
- See `SUPABASE_RLS_AUDIT.md` for the full table-by-table analysis.

### 3.2 Service Role Key Exposure
**Status: ACCEPTABLE with recommendation**

- `createAdminClient()` uses `SUPABASE_SERVICE_ROLE_KEY` — environment variable, server-only.
- `src/lib/supabase/admin.ts` has a warning comment but lacks `import "server-only"`.
- **If accidentally imported in a Client Component, the service role key would be bundled and exposed.** A `"server-only"` guard causes a build-time error instead.

### 3.3 Admin Client Usage Scope
**Status: ACCEPTABLE**

- Used where RLS intentionally does not apply: kid login (no parent JWT), cron jobs, privileged service operations.
- In all cases the application enforces its own authorization check before calling admin queries.

---

## 4. Child Data Protection

### 4.1 Profile Data
**Status: GOOD**

- Child profiles contain: name, nickname, avatar_key, color_theme, pin_hash, credit_balance, xp_total, level.
- No email, phone number, date of birth, or location stored.
- Photos stored under `{familyId}/{childId}/` — only accessible via authenticated proxy, never via public Supabase storage URL.

### 4.2 AI Interaction — Child Data Sent to Claude API
**Status: GOOD**

- `generateXtraCoachPlan` sends only: `childAge` (optional integer), `goal` (parent-typed string), and `existingTitles` (chore titles, not child names or IDs).
- **Child names are never sent to the Anthropic API.**
- `cleanText()` sanitizes all parent inputs before including in the prompt.
- AI output is fully validated via `validatePlan` / `validateMission` with allowlisted categories, clamped integers, and length limits — AI response cannot inject executable code or invalid data.

### 4.3 Activity Logs
**Status: MEDIUM CONCERN**

- `activity_logs.metadata` is a `jsonb` column storing event-specific data.
- Some entries include `child_name` in plaintext (e.g., `bonus_credits_awarded` event).
- The CSV export includes child names — appropriate for the parent-facing export but should be documented as a PII-containing export.
- **No data retention or deletion schedule is defined.**

### 4.4 Chore Photos
**Status: GOOD**

- Server-side upload validates: origin, file size (≤5MB), MIME type allowlist (jpeg/png/webp), and magic-byte signature check.
- Stored in a private Supabase storage bucket.
- Served only through authenticated proxy.
- `Cache-Control: private, no-store` — photos are not cached.

---

## 5. Financial Integrity

### 5.1 Stripe Webhook
**Status: STRONG**

- Uses `stripe.webhooks.constructEvent()` with `stripe-signature` header — cryptographic verification, replay-attack resistant.
- Only processes `customer.subscription.created/updated/deleted` events.

### 5.2 Credit Balance Integrity
**Status: STRONG**

- `approve_reward_redemption` is a single SECURITY DEFINER transaction with `FOR UPDATE` row locks — atomically checks balance, checks status, updates status, inserts debit, recalculates balance.
- `recalculate_child_balance` recomputes from the full transaction ledger rather than incrementing — prevents balance drift.

### 5.3 Credit Manipulation
**Status: ACCEPTABLE**

- Children can submit chore completions but cannot approve them — parents approve, triggering server-side credit issuance.
- Children can request reward redemptions but cannot approve them — parents approve via the atomic RPC.
- `awardBonusCredits` validates amount (1–500) and requires a description ≥3 chars.

---

## 6. Web Vulnerabilities

### 6.1 Content Security Policy
**Status: MEDIUM ISSUE**

- `script-src 'self' 'unsafe-inline'` — allows arbitrary inline scripts. If an XSS injection point is found, inline scripts will execute unrestricted.
- `style-src 'self' 'unsafe-inline'` — allows CSS injection, which can be used for data exfiltration attacks.
- **Recommendation:** Replace `'unsafe-inline'` with nonce-based CSP.

### 6.2 CSRF
**Status: GOOD**

- Server actions use Next.js `"use server"` — Next.js applies CSRF protection automatically.
- API routes that accept POST check `isSameOriginRequest` which verifies the `Origin` header.
- **Note:** `isSameOriginRequest` returns `false` when Origin is absent — may affect some Safari versions on same-site form submissions.

### 6.3 Injection
**Status: GOOD**

- All DB queries use Supabase's parameterized query builder — no string concatenation.
- AI prompt inputs go through `cleanText(value, maxLength)` and AI output is strictly validated.

### 6.4 XSS
**Status: GOOD**

- Server-rendered content via React — React escapes output by default.
- Weekly report email uses `escapeHtml()` on all dynamic values.

### 6.5 Security Headers
**Status: GOOD with gaps**

- HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy all present ✓
- **Missing:** `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `X-Permitted-Cross-Domain-Policies`.

### 6.6 Rate Limiting — API Routes
**Status: PARTIAL**

| Endpoint | Rate Limited |
|----------|-------------|
| `/api/kid-login` | Yes (IP + per-child) |
| AI actions (server action) | Yes (10/hr per user) |
| `/api/kid-upload-photo` | **No** |
| `/api/push/subscribe` | **No** |
| `/api/push/kid-subscribe` | **No** |
| `/api/export/activity` | **No** (has row cap but no per-user throttle) |
| `/api/kid-session/refresh` | **No** |

---

## 7. Infrastructure

### 7.1 Environment Variables
**Status: GOOD**

- All secrets (service role key, signing key, Stripe, Anthropic, VAPID private, Resend) are server-only environment variables.
- Public variables (`NEXT_PUBLIC_*`) contain only non-secret configuration.
- **GAP:** No `.env.example` file found.

### 7.2 Missing Session Middleware
**Status: HIGH CONCERN** — See F-01

No `src/middleware.ts` exists. Without it:
- Parent JWT sessions are not refreshed on every request.
- There is no server-enforced route protection for `/parent/*` routes.
- Protection relies on each page calling `auth.getUser()` individually.

### 7.3 Logging
**Status: ACCEPTABLE**

- Non-critical async failures use `console.error` — acceptable for now.
- No structured logging framework — consider adopting one before production scale.

### 7.4 Cron Security
**Status: GOOD**

- `authorizeCronRequest` uses `timingSafeEqual` on `Bearer ${CRON_SECRET}` — constant-time comparison.

---

## 8. Privacy (COPPA)

See `COPPA_GAP_ANALYSIS.md` for the full analysis.

**Key gaps:** No verifiable parental consent, no published privacy policy, no data retention schedule, no documented third-party disclosures.

---

## Findings Summary

| ID | Severity | Area | Title |
|----|----------|------|-------|
| F-01 | **High** | Infrastructure | No `middleware.ts` — JWT session refresh and route protection absent |
| F-02 | **Medium** | CSP | `'unsafe-inline'` in `script-src` and `style-src` |
| F-03 | **Medium** | Rate Limiting | Photo upload, push subscribe, session refresh have no rate limits |
| F-04 | **Medium** | Privacy/COPPA | No verifiable parental consent mechanism |
| F-05 | **Medium** | Privacy/COPPA | No data retention or deletion policy |
| F-06 | **Medium** | Child Data | `activity_logs.metadata` stores child names without documented retention |
| F-07 | Low | Admin Client | `createAdminClient` lacks `import "server-only"` guard |
| F-08 | Low | Session Cookie | Kid session cookie scoped to `path: "/"` instead of `path: "/kid"` |
| F-09 | Low | Auth | Parent login lacks application-layer rate limit |
| F-10 | Low | Infrastructure | No `.env.example` for developer onboarding |
| F-11 | Low | Headers | Missing `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy` |
| F-12 | Low | Privacy | No Privacy Policy / Terms of Service linked in app |
