# KidsXtra Monitoring Setup

**Last updated:** 2026-11-21

---

## 1. Health Probe

### Endpoint

`GET /api/health`

Public, unauthenticated. Returns JSON:

```json
{
  "ok": true,
  "db": "ok",
  "ts": "2026-11-21T12:00:00.000Z",
  "env": "production"
}
```

| Field | Values | Meaning |
|---|---|---|
| `ok` | `true` / `false` | Overall health |
| `db` | `"ok"` / `"error"` | Supabase reachability |
| `ts` | ISO 8601 | Server time at probe |
| `env` | `"production"` / `"preview"` / `"development"` | Vercel environment |

**HTTP status:** `200` when healthy, `503` when `db` is `"error"`.

The probe is intentionally lightweight: it runs `SELECT id FROM families LIMIT 1` using the service-role admin client. This catches network partitions and Supabase pauses while avoiding heavy queries.

### Vercel Health Checks

In your Vercel project settings → **Settings → Health Checks**, add `/api/health`. Vercel will block deployments and trigger rollback when this probe returns non-2xx.

---

## 2. Admin Dashboard

`GET /admin/health` — Protected by HTTP Basic Auth (`ADMIN_HEALTH_PASSWORD`). Renders a simple status page built from `/api/health` output plus Vercel deployment metadata.

Credentials are set at deploy time and never shared in source code. If `ADMIN_HEALTH_PASSWORD` is not set, the route is accessible without credentials only in development.

---

## 3. Sentry Error Tracking

### Installation

`@sentry/nextjs` is already installed. Configuration files:

| File | Purpose |
|---|---|
| `sentry.client.config.ts` | Browser errors, 10% trace sampling in prod |
| `sentry.server.config.ts` | Server errors, PII scrubbing for `childId` / `childName` / `pin` |
| `sentry.edge.config.ts` | Edge middleware errors, 5% sampling |
| `src/instrumentation.ts` | Next.js instrumentation hook — loads server/edge config at runtime |

> The `@sentry/nextjs` version used here does NOT export `withSentryConfig`. Use the instrumentation hook only.

### Environment Variables

```env
NEXT_PUBLIC_SENTRY_DSN=https://key@oXXXXXX.ingest.sentry.io/XXXXXXX
SENTRY_DSN=https://key@oXXXXXX.ingest.sentry.io/XXXXXXX
SENTRY_AUTH_TOKEN=sntrys_...           # for source map upload in CI
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=kidsxtra
```

### Setup Steps

1. Create a project in [sentry.io](https://sentry.io) (platform: Next.js).
2. Copy the DSN from **Settings → Projects → kidsxtra → Client Keys**.
3. Add both `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN` to Vercel environment variables.
4. For source maps in CI, add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
5. Deploy; verify a test error appears in Sentry within 2 minutes.

### PII Scrubbing

`sentry.server.config.ts` uses a `beforeSend` hook to remove sensitive fields:

```typescript
beforeSend(event) {
  // Strip child-identifying fields from all error reports
  if (event.extra) {
    delete event.extra.childId
    delete event.extra.childName
    delete event.extra.pin
  }
  return event
}
```

This is a defense-in-depth measure. Never pass children's PII to Sentry in the first place — treat this as a safety net only.

### Sentry Alerts

Configure at **Alerts → Alert Rules**:

| Rule | Condition | Action |
|---|---|---|
| Error spike | > 10 new errors in 5 min | Email + Slack |
| Unhandled rejections | Any `unhandledRejection` | Email |
| Performance degradation | p95 > 2,000 ms | Email |
| New issue | First occurrence of any issue | Email |

---

## 4. Vercel Observability

Vercel provides built-in metrics under **Analytics** and **Speed Insights**:

| Panel | What to watch |
|---|---|
| **Functions** | Invocation count, error rate, duration |
| **Speed Insights** | Real-user Core Web Vitals (LCP, INP, CLS) |
| **Logs** | Structured runtime logs, filterable by route |

Enable **Speed Insights** in your project settings — it's free for Hobby/Pro plans.

### Key Metrics

- **Function error rate** — alert at > 1% over 5 minutes.
- **Function duration p99** — alert at > 3,000 ms.
- **Build time** — baseline ~2 minutes; investigate at > 5 minutes.
- **Deployment frequency** — healthy teams deploy daily; < 1/week is a signal.

---

## 5. Supabase Dashboard

Navigate to **Supabase Dashboard → your project**:

| Panel | Metric | Healthy range |
|---|---|---|
| **Database** → Connections | Active connections | < 60 (Supabase free: max 60) |
| **Database** → Replication lag | Replication delay | < 1 s |
| **API** → Request count | Requests/min | Monitor for sudden spikes |
| **Auth** → Active users | Sessions | Baseline + alert on 10× spike |
| **Storage** → Usage | Data size | < 80% of plan limit |
| **Edge Functions** → Logs | Error rate | < 0.1% |

### Row-Level Security Verification

Periodically verify RLS is enforced — especially after schema migrations:

```sql
-- Should return 0 (anon role cannot read families directly)
SELECT count(*) FROM families;
-- Run this as the anon key holder, not service role
```

---

## 6. Uptime Monitoring (External)

For external uptime monitoring independent of Vercel:

| Tool | Free tier | Setup |
|---|---|---|
| [Better Uptime](https://betteruptime.com) | 10 monitors | Monitor `/api/health`, alert on 503 |
| [UptimeRobot](https://uptimerobot.com) | 50 monitors | 5-min intervals |
| [Pagerduty](https://pagerduty.com) | Free for small teams | Integrates with Better Uptime |

Recommended: monitor from at least 2 geographic regions to distinguish app errors from regional network issues.

---

## 7. Alerting Thresholds Summary

| Signal | Threshold | Severity | Responder |
|---|---|---|---|
| `/api/health` returning 503 | Any occurrence | P0 | On-call |
| Sentry error rate | > 10 new errors / 5 min | P1 | On-call |
| Vercel function p99 duration | > 3,000 ms sustained 5 min | P1 | On-call |
| Supabase connections | > 50 active | P2 | Next business day |
| Supabase replication lag | > 2 s | P2 | Next business day |
| Deployment failure | Any failed deploy | P2 | Deploying engineer |

---

## 8. Runbook Cross-References

- For alert response procedures: see `INCIDENT_RESPONSE.md`
- For automated recovery configuration: see `AUTOMATED_RECOVERY.md`
- For load testing setup: see `LOAD_TEST_PLAN.md`
