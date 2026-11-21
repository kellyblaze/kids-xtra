# KidsXtra Reliability Audit

**Date:** 2026-11-21  
**Scope:** Read-only static analysis of source code. No production systems were queried, no data was modified, and no secrets were accessed or printed.  
**Auditor note:** Findings are based solely on what was observed in source files. Potential risks marked "unverified" were not confirmed through runtime testing.

---

## 1. Framework & Deployment

**Current state:**  
- Next.js 16.3.4 (App Router), React 19.2.4, TypeScript, deployed on Vercel.  
- `vercel.json` defines 3 cron jobs: `weekly-report` (Mon 9 AM UTC), `send-chore-reminders` (every 5 min), `purge-expired-data` (daily 3 AM UTC).  
- Static security headers set in `next.config.ts`: HSTS, X-Content-Type-Options, X-Frame-Options DENY, COOP/CORP same-origin, Permissions-Policy.  
- CSP is generated per-request in middleware with a nonce.

**Gaps / Risks:**  
- No `package-lock.json` or `yarn.lock` confirmed in the working tree. Without a lockfile, `npm install` on Vercel can resolve different dependency versions across deploys. **Priority: P1**  
- Vercel cron job `maxDuration` is set to 300 s on the weekly-report route. The reminder cron runs every 5 min; if it exceeds 300 s it will overlap with the next invocation. No concurrency guard was observed. **Priority: P2**

**Recommended fix:**  
- Commit `package-lock.json` to the repository (run `npm install` and commit the result).  
- Add a database-backed mutex (e.g. a `cron_locks` table row with TTL) to the reminder route to prevent overlapping runs.

---

## 2. Supabase Integration

**Current state:**  
- `@supabase/ssr ^0.12.0` used for SSR client (`createServerClient`).  
- `createAdminClient()` in `src/lib/supabase/admin.ts` uses `SUPABASE_SERVICE_ROLE_KEY` with `autoRefreshToken: false, persistSession: false` — correct for server-only use.  
- Middleware refreshes the session on every request via `supabase.auth.getUser()`.  
- RLS policies exist (bypassed intentionally only via admin client on server).

**Gaps / Risks:**  
- No connection pooling configuration observed (e.g. Supabase connection pooler / pgBouncer). At scale, cron jobs iterating all families while the web server also runs queries could exhaust the Postgres connection limit. **Priority: P2**  
- `getBalanceIntegrity()` in `src/app/admin/health/page.tsx` fetches up to 20,000 `credit_transactions` rows unbounded (`.select("amount")`). At scale this will cause slow page loads and high memory use. **Priority: P2**

**Recommended fix:**  
- Use Supabase's transaction pooler for cron/admin routes.  
- Replace the unbounded transaction fetch in the health page with an aggregate RPC (`sum(amount) GROUP BY child_id`) instead of fetching every row.

---

## 3. Testing Coverage

**Current state:**  
- `package.json` defines a `test` script using the Node.js built-in test runner with `--experimental-strip-types`.  
- The `tests/` directory was found but contained no test files.  
- No `*.test.ts`, `*.spec.ts`, `*.test.tsx`, or `*.spec.tsx` files were found anywhere in the project.

**Gaps / Risks:**  
- **Zero test coverage.** No unit tests, integration tests, or E2E tests exist. This means:  
  - Regressions in business logic (chore credit calculations, reward approval atomicity, COPPA purge logic) go undetected.  
  - The atomic `approve_reward_redemption` RPC and the HMAC session token signing have no test harness.  
  - The PKCE password-reset flow cannot be regression-tested.  
  **Priority: P0**

**Recommended fix:**  
- Add unit tests for: `getMissionState()`, `authorizeChildAccess()`, `verifyKidSession()` / `createKidSession()`, the COPPA purge logic, and the cron authorization helper.  
- Add integration tests for the kid-login route (rate limiting, PIN hashing, session cookie format) and reward approval flow.  
- Target ≥ 80% coverage on `src/lib/`.

---

## 4. Logging & Monitoring

**Current state:**  
- `src/lib/logger.ts` provides a JSON structured logger (`{ level, msg, ts, ...context }`).  
- Logger is used in cron routes; it is not confirmed used universally across all API routes.  
- No Sentry SDK (`@sentry/nextjs`) is present in `package.json`.  
- No external monitoring or alerting integration was found.

**Gaps / Risks:**  
- No error tracking service. Uncaught exceptions in Server Actions, Route Handlers, or cron jobs will surface only in Vercel function logs, which are not searchable or alertable. **Priority: P1**  
- No uptime monitoring. There is no health-check endpoint exposed externally (the `/admin/health` page is an internal dashboard, not a lightweight probe endpoint). **Priority: P1**  
- If the logger is not used in all Route Handlers, some errors will be silently swallowed. **Priority: P2**

**Recommended fix:**  
- Integrate Sentry (`@sentry/nextjs`) with DSN in env vars. Add `instrumentation.ts` for server-side error capture.  
- Create a lightweight `GET /api/health` endpoint that checks DB connectivity and returns `{ ok: true, latency_ms }` — suitable for Uptime Kuma or similar.  
- Audit all Route Handlers and Server Actions to ensure they call `logger.error(...)` in every catch block.

---

## 5. Background Jobs / Crons

**Current state:**  
- `send-chore-reminders` runs every 5 minutes. It iterates all families, then for each family queries assignments, stages, and existing deliveries. This is a serial N+1 pattern: 1 families query + up to 4 queries per family.  
- `purge-expired-data` runs daily. It performs hard-deletes of child profiles and Supabase Storage photos for COPPA compliance.  
- `send-weekly-report` runs weekly.  
- All cron routes use `authorizeCronRequest()` which performs `timingSafeEqual` on the Bearer token.

**Gaps / Risks:**  
- **Logic inversion in `purge-expired-data`**: the route checks `if (!authorizeCronRequest(request)) return 401`. However, `authorizeCronRequest` returns `null` when authorized (success) and a `NextResponse` (the 401 response) when unauthorized. `!null === true`, so the condition evaluates to `true` for authorized requests and the route would incorrectly return 401 for all legitimate cron calls. The other cron routes use the correct pattern (`const authError = authorizeCronRequest(request); if (authError) return authError`). **Priority: P0 — COPPA purge never runs as written.**  
- N+1 query pattern in `send-chore-reminders`. With many families the cron may exceed 300 s and time out on Vercel, causing missed reminders. **Priority: P1**  
- No dead-letter queue or failure alerting if a cron invocation errors mid-way through families.

**Recommended fix:**  
- Fix `purge-expired-data` immediately: replace `if (!authorizeCronRequest(request))` with `const authError = authorizeCronRequest(request); if (authError) return authError;` — matching the pattern in the other two cron routes.  
- Refactor `send-chore-reminders` to batch-load data for all families in a small number of queries rather than querying per family.

---

## 6. Error Handling

**Current state:**  
- Cron routes wrap the main logic in a `try/catch` and return structured JSON errors.  
- Server Actions in `src/app/actions/` return `{ error: string } | undefined` — consistent pattern.  
- `approveChoreCompletion` uses sequential DB writes (3 RPCs + 1 direct write) without a transaction wrapper; a mid-sequence failure leaves data in a partial state.

**Gaps / Risks:**  
- `approveChoreCompletion` is not atomic. If the XP RPC succeeds but the streak RPC fails, the child gets XP without a streak update (or vice versa). `approveRewardRedemption` is atomic via a single RPC — that pattern should be applied here too. **Priority: P1**  
- No global unhandled-rejection handler was observed for the Next.js runtime. **Priority: P2**

**Recommended fix:**  
- Wrap the multi-step chore approval logic in a single Postgres function (RPC) so all three side effects are atomic, matching the reward approval pattern.

---

## 7. Performance

**Current state:**  
- Parent dashboard page fetches 7 parallel Supabase queries (all inside `Promise.all`) — good.  
- Kid mission list page uses a parallel fetch strategy for assignment + completions.  
- DB-backed rate limiting (`consume_auth_rate_limit` RPC) adds one round-trip to every kid login attempt.

**Gaps / Risks:**  
- `getBalanceIntegrity()` on the health page fetches up to 500 child rows and 20,000 transaction rows. This is not a user-facing path, but it could block health checks. **Priority: P2**  
- No caching layer (Redis, Vercel KV, or even in-memory LRU) for hot read paths like the family's active chores list or child balance. **Priority: P3**  
- The reminder cron's N+1 pattern (see §5) is also a performance risk. **Priority: P1** (already noted)

**Recommended fix:**  
- Replace the row-fetching balance integrity check with an aggregate SQL query.  
- Evaluate Vercel KV (Redis) for caching child balances and active chore lists with a short TTL (e.g. 60 s), reducing Supabase read load.

---

## 8. Security

**Current state:**  
- Argon2 PIN hashing (`@node-rs/argon2`) with legacy SHA-256 fallback.  
- HMAC-SHA-256 signed kid session cookies (custom format: `childId.expiresAt.signature`).  
- DB-backed rate limiting with HMAC-hashed IP+action bucket keys (anonymized).  
- Same-origin check on kid login route.  
- CSP with per-request nonce in middleware.  
- No hardcoded secrets found in source files reviewed.  
- `.env.example` documents 15 env vars with placeholder values only.

**Gaps / Risks:**  
- **Admin health page has no authentication guard.** `src/app/admin/health/page.tsx` is a Server Component that renders family metrics, DB latency, and queue depth. It references `ADMIN_HEALTH_PASSWORD` in the required env list but the page component itself does not verify any password before rendering. If middleware does not protect `/admin/*`, this page is publicly accessible. The middleware was confirmed to protect `/parent/*` routes but `/admin/*` protection was not confirmed. **Priority: P0**  
- Kid session tokens have a 30-day expiry with no server-side revocation mechanism observed. If a device is stolen, the session cannot be invalidated without a DB-side token store. **Priority: P2**  
- The VAPID private key for Web Push is an env var (`VAPID_PRIVATE_KEY`). Loss or rotation of this key invalidates all push subscriptions silently. No rotation procedure was documented. **Priority: P3**

**Recommended fix:**  
- Add an explicit password check to `src/app/admin/health/page.tsx` (read `ADMIN_HEALTH_PASSWORD` from env and render a 403 or redirect if the request does not carry the correct header/cookie). Alternatively, protect `/admin/*` in middleware.  
- Add a `kid_session_revocations` table (or store a `jti` on the session) to enable server-side revocation of kid sessions.

---

## 9. CI/CD

**Current state:**  
- No `.github/workflows/` directory was found. There is no CI pipeline.  
- Deployments appear to be triggered directly by Vercel's Git integration.

**Gaps / Risks:**  
- No automated checks (type-check, lint, tests) run before a commit is deployed. A TypeScript error or broken import could ship to production. **Priority: P1**  
- No branch protection rules can be verified from source code alone. **Priority: P1**

**Recommended fix:**  
- Add `.github/workflows/ci.yml` running at minimum: `tsc --noEmit`, `next build` (build smoke test), and the test suite once tests exist.  
- Enable Vercel Preview Deployments for PRs and require CI to pass before merge.

---

## 10. Dependencies

**Current state:**  
- Key production dependencies: Next.js ^16.3.4, React 19.2.4, `@supabase/ssr ^0.12.0`, `stripe ^22.6.2`, `web-push ^3.6.7`, `@anthropic-ai/sdk ^0.104.1`, `@node-rs/argon2 ^2.2.1`.  
- No `npm audit` output was available; this audit is based on package names and versions only.

**Gaps / Risks:**  
- No automated dependency vulnerability scanning (Dependabot, Renovate, or `npm audit` in CI). **Priority: P1**  
- `^` ranges on `stripe` and `@supabase/ssr` allow minor/patch bumps on install. Without a lockfile (see §1) a bump could introduce a breaking change silently. **Priority: P1**

**Recommended fix:**  
- Enable GitHub Dependabot alerts and auto-PRs for security patches.  
- Commit `package-lock.json` (see §1) and pin major versions in `package.json` for critical integrations (Stripe, Supabase).

---

## Summary Table

| Area | Priority | Finding |
|------|----------|---------|
| **Cron auth bug** | **P0** | `purge-expired-data` logic inversion — COPPA purge never runs |
| **Admin health page** | **P0** | No authentication guard — potential public exposure of family metrics |
| **Zero test coverage** | **P0** | No tests exist anywhere in the project |
| No CI pipeline | P1 | TypeScript errors and broken builds can ship without detection |
| No error tracking | P1 | Exceptions not captured; no alerting on failures |
| No lockfile | P1 | Dependency versions can drift between Vercel deploys |
| Dependency scanning | P1 | No Dependabot / `npm audit` in CI |
| `approveChoreCompletion` not atomic | P1 | Partial state possible if mid-sequence failure occurs |
| N+1 in reminder cron | P1 | Cron may time out with many families |
| No uptime monitoring | P1 | No external health probe or alerting |
| Unbounded transaction query | P2 | 20,000-row fetch in health page |
| No cron concurrency guard | P2 | Reminder cron can overlap if slow |
| Kid session no revocation | P2 | Stolen device sessions cannot be invalidated |
| No connection pooling config | P2 | DB connections may exhaust under load |
| Caching absent | P3 | Hot read paths hit Supabase on every request |
| VAPID key rotation | P3 | No documented rotation procedure |

---

## Out of Scope

- Runtime load testing or penetration testing (read-only audit)  
- COPPA legal certification (source-code review alone cannot certify compliance)  
- Production database contents or user data  
- Third-party infrastructure (Supabase, Vercel, Stripe, Anthropic API)
