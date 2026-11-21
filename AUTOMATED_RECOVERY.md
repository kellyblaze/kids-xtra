# KidsXtra Automated Recovery

**Last updated:** 2026-11-21

---

## Overview

Automated recovery reduces the blast radius of transient failures — network blips, service restarts, rate limits — without requiring human intervention. This document describes the patterns in use and how to configure them.

The two core primitives are:

| Pattern | Use case |
|---|---|
| **Retry with exponential back-off** | Transient errors that go away on their own |
| **Circuit breaker** | Persistent errors that would waste resources on retries |

---

## 1. Retry Utility — `src/lib/retry.ts`

### Design

The `withRetry` function wraps any async operation with configurable retry logic using exponential back-off and jitter:

```
attempt 1 — immediate
attempt 2 — ~100ms wait
attempt 3 — ~200ms wait  (+ ±20% jitter)
attempt 4 — ~400ms wait
...
```

Jitter prevents the "thundering herd" problem where many clients retry at the same instant after a shared failure.

### Configuration

```typescript
interface RetryConfig {
  maxAttempts: number    // default: 3
  baseDelayMs: number    // default: 100ms
  maxDelayMs: number     // default: 10,000ms
  retryOn?: (error: unknown) => boolean  // which errors to retry
}
```

### What to Retry

**Retry:** network timeouts, `ECONNRESET`, HTTP 429 (rate limit), HTTP 503 (temporary unavailability).

**Do not retry:** HTTP 400 (bad request), HTTP 401/403 (auth errors), HTTP 404 (not found), validation errors. These are programming errors or expected states — retrying wastes time and can cause side effects on non-idempotent operations.

### Applied To

| Service | Why |
|---|---|
| Resend email sending | SMTP/HTTP transient failures |
| Web push notifications | FCM/VAPID delivery blips |
| Stripe API calls | Stripe occasionally has transient 500s |
| Supabase storage | Object storage latency spikes |

**Not applied to:**
- Supabase DB queries — handled by the connection pool
- Auth operations — retrying failed logins creates security risks
- Webhook responses — the caller (Stripe, Sentry) handles retries

---

## 2. Circuit Breaker — `src/lib/circuit-breaker.ts`

### Design

A circuit breaker prevents cascading failures by stopping calls to a dependency that is consistently failing. It has three states:

```
CLOSED → (failure threshold reached) → OPEN
OPEN → (timeout expires) → HALF-OPEN
HALF-OPEN → (probe succeeds) → CLOSED
HALF-OPEN → (probe fails) → OPEN
```

| State | Behavior |
|---|---|
| **CLOSED** | Normal operation; failures are counted |
| **OPEN** | All calls fail immediately (fast-fail); no network calls made |
| **HALF-OPEN** | One probe call allowed; success → CLOSED, failure → OPEN |

### Configuration

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number   // default: 5 — failures before opening
  successThreshold: number   // default: 2 — successes to close from half-open
  timeout: number            // default: 60,000ms — time in OPEN before half-open
  name: string               // for logging and metrics
}
```

### Applied To

| Dependency | Breaker name | Failure threshold | Timeout |
|---|---|---|---|
| Resend (email) | `resend-email` | 5 failures | 60 s |
| OpenAI API | `openai-api` | 3 failures | 120 s |
| Anthropic API | `anthropic-api` | 3 failures | 120 s |
| Stripe API | `stripe-api` | 5 failures | 60 s |

### Fast-Fail Behavior

When a circuit is OPEN, the caller receives a structured error immediately:

```typescript
{
  success: false,
  error: "Circuit breaker open: resend-email is unavailable",
  retryAfter: 60  // seconds
}
```

The UI should show a user-friendly message like "Notifications are temporarily unavailable. We'll keep trying." rather than surfacing the technical error.

---

## 3. Retry + Circuit Breaker Together

The two patterns compose: wrap the circuit-breaker-protected call with `withRetry`. Retries only fire when the circuit is CLOSED. When the circuit opens, retries stop immediately.

```
withRetry(
  () => circuitBreaker.execute(() => sendEmail(...)),
  { maxAttempts: 3 }
)
```

---

## 4. Vercel Deployment Auto-Rollback

Vercel automatically monitors the health probe on `/api/health` after each deployment. If the probe fails within the deployment's health-check window:

1. Vercel stops routing production traffic to the new deployment.
2. The previous deployment continues serving traffic.
3. A deployment failure notification is sent (email + Vercel dashboard alert).

**Setup:** in Vercel project settings → **Health Checks**, add `/api/health` with a 30-second timeout.

This is automatic once configured — no code changes needed.

---

## 5. Cron Job Reliability

Cron jobs (`/api/tasks/*`) are authenticated via `CRON_SECRET`. Key design notes:

- **Auth check pattern**: `authorizeCronRequest` returns `null` on success, `NextResponse` on failure. Always check with `const authError = authorizeCronRequest(request); if (authError) return authError`.
- **Idempotency**: all cron handlers are idempotent — running them twice in a row produces the same result as running once.
- **Failure isolation**: a cron handler that throws does not affect other cron handlers or user-facing routes.

If a cron job fails, check:
1. Vercel cron logs (Dashboard → Functions → Cron).
2. `CRON_SECRET` is set in environment variables.
3. The cron schedule in `vercel.json` is correct.

---

## 6. Database Connection Resilience

Supabase connections are managed by the Supabase client library. The service-role admin client is created per request (not shared across requests) to avoid stale connections.

If connections are exhausted:
1. Check Supabase Dashboard → Database → Connections.
2. Supabase free tier: 60 max connections. Upgrade to Pro for connection pooling (PgBouncer).
3. Short-term: redeploy to restart all function instances and clear lingering connections.

---

## 7. Alerting on Recovery Events

Circuit breaker state changes and retry exhaustion should be logged with structured tags that Sentry can capture:

```typescript
Sentry.captureMessage("Circuit breaker opened", {
  level: "warning",
  tags: { circuit: "resend-email" },
  extra: { failureCount: 5 }
})
```

Configure a Sentry alert rule to notify on `circuit breaker opened` messages at "warning" level.

---

## 8. Manual Recovery Procedures

If automated recovery does not resolve an incident:

| Situation | Manual action |
|---|---|
| Circuit breaker stuck OPEN | Redeploy the app — breakers are in-memory and reset on startup |
| Retry budget exhausted | Check the dependency's status page; wait and retry manually |
| DB connection pool exhausted | Restart the Supabase project from the dashboard |
| Vercel function timeout loop | Check for an infinite loop or missing await; rollback the deployment |

---

## 9. Runbook Cross-References

- For alert investigation: see `INCIDENT_RESPONSE.md`
- For deployment rollback procedure: see `INCIDENT_RESPONSE.md §4`
- For monitoring thresholds: see `MONITORING_SETUP.md §7`
