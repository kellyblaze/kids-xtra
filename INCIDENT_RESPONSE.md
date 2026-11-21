# KidsXtra Incident Response Runbook

**Last updated:** 2026-11-21

> This document defines how to detect, respond to, and learn from incidents.  
> **Never print children's personal information in incident reports or Slack messages.**

---

## 1. Severity Levels

| Level | Definition | Response time | Example |
|---|---|---|---|
| **P0** | App completely unavailable | 15 min | `/api/health` returning 503 for > 5 min |
| **P1** | Critical user path broken | 30 min | Parent login failing; chore submission errors |
| **P2** | Degraded experience | 2 hours | Slow page loads; push notifications failing |
| **P3** | Minor or cosmetic issue | Next sprint | UI glitch; non-critical feature unavailable |

---

## 2. Detection Sources

| Source | What it catches |
|---|---|
| Vercel health check on `/api/health` | App unreachable, Supabase down |
| Sentry error alerts | Unhandled exceptions, rate spikes |
| Vercel Function logs | 500 errors, timeout errors |
| Supabase Dashboard | DB connection exhaustion, slow queries |
| External uptime monitor | Regional network issues |
| User reports | Edge cases not caught by monitoring |

---

## 3. Incident Response Workflow

### Step 1 — Detect & Declare

When an alert fires or a user reports an issue:

1. Check `/api/health` — is the DB reachable?
2. Check Vercel Function logs for errors in the last 10 minutes.
3. Check Sentry for a spike in new issues.
4. **Declare severity** (P0–P3) based on the table above.
5. Post to `#incidents` Slack channel (or equivalent):
   ```
   🚨 P[N] INCIDENT DECLARED
   Summary: [one sentence]
   Started: [time]
   Investigating: [your name]
   ```

### Step 2 — Triage

**P0 / P1 checklist:**

- [ ] Is Vercel experiencing an outage? Check [vercel-status.com](https://www.vercel-statuspage.io/).
- [ ] Is Supabase experiencing an outage? Check [status.supabase.com](https://status.supabase.com/).
- [ ] Did a deployment happen in the last 30 minutes? If yes → consider rollback (see §4).
- [ ] Are DB connections exhausted? Check Supabase Dashboard → Database → Connections.
- [ ] Are Sentry errors pointing to a specific route or function?

### Step 3 — Mitigate

Apply the fastest safe fix first. Options in order of preference:

1. **Rollback the deployment** — fastest if a code change caused it (see §4).
2. **Scale or restart** — in Vercel, redeploy from the last known good commit.
3. **Disable a feature** — if the issue is in a specific non-critical feature, consider removing or feature-flagging it.
4. **Fix forward** — only if the fix is small, low-risk, and can be deployed in < 15 min.

### Step 4 — Verify

- [ ] `/api/health` returns `{ ok: true, db: "ok" }`.
- [ ] Sentry error rate returns to baseline.
- [ ] Manually test the affected user path end-to-end.
- [ ] Post resolution to `#incidents`:
  ```
  ✅ RESOLVED
  Duration: [X] minutes
  Root cause: [one sentence]
  Fix applied: [one sentence]
  ```

### Step 5 — Post-Mortem

For P0 and P1 incidents, write a post-mortem within 48 hours.

Template:

```markdown
## Incident Post-Mortem — [Date] [Short Title]

**Severity:** P[N]  
**Duration:** [start] – [end] ([X] minutes)  
**Affected users:** [estimate — no names or IDs]

### Timeline
- HH:MM — [event]
- HH:MM — [event]

### Root Cause
[1–2 sentences]

### Contributing Factors
- [factor 1]
- [factor 2]

### What Went Well
- [item]

### Action Items
| Item | Owner | Due |
|---|---|---|
| [item] | [name] | [date] |
```

---

## 4. Rollback Procedure

### Via Vercel Dashboard

1. Open **Vercel Dashboard → Deployments**.
2. Find the last known good deployment (before the incident started).
3. Click **…** → **Promote to Production**.
4. Wait for the new deployment to go live (~1–2 minutes).
5. Verify `/api/health` returns `{ ok: true }`.

### Via CLI

```bash
# List recent deployments
vercel ls --prod

# Roll back to a specific deployment ID
vercel rollback <deployment-id>
```

---

## 5. Common Scenarios

### Database Unreachable

**Symptoms:** `/api/health` returns `{ ok: false, db: "error" }`.

**Checks:**
1. Check [status.supabase.com](https://status.supabase.com/) for a platform outage.
2. Verify `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` are set correctly in Vercel.
3. Check Supabase Dashboard → Database → Connections: if near the limit, connections may be timing out.

**Resolution:** If it's a Supabase outage, wait and monitor. If connections are exhausted, check for a runaway query or connection leak and restart the Supabase project if needed.

---

### Parent Login Failing

**Symptoms:** Sentry errors on the auth flow; parents report being unable to log in.

**Checks:**
1. Test login manually with a known-good test account.
2. Check Sentry for the exact error — is it a Supabase auth error or a cookie error?
3. Check if `KID_SESSION_SECRET` or Supabase auth keys changed recently.

**Resolution:** Verify environment variables are set. Check if Supabase Auth is under maintenance.

---

### Cron Jobs Not Running

**Symptoms:** Data not being purged; daily missions not being assigned.

**Checks:**
1. Check Vercel Dashboard → Functions → Log for the cron route.
2. Verify `CRON_SECRET` is set in Vercel environment variables.
3. Check `src/lib/cron-auth.ts`: the `authorizeCronRequest` function returns `null` on success and a `NextResponse` on failure — the caller must check `if (authError) return authError`.

**Common cause:** The cron auth check was historically inverted (P0 bug fixed in commit `85057f0`). If this recurs, verify the check pattern.

---

### Push Notifications Failing

**Symptoms:** Parents report not receiving push notifications.

**Checks:**
1. Check Sentry for errors from the push notification service.
2. Verify `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` are set.
3. Check if the user has revoked browser notification permission.

**Resolution:** Push notifications are best-effort and non-critical. Log the error and continue.

---

### Stripe Webhook Failures

**Symptoms:** Subscriptions not activating or deactivating.

**Checks:**
1. Check Stripe Dashboard → Webhooks → Attempts for failed deliveries.
2. Verify `STRIPE_WEBHOOK_SECRET` is set and matches the endpoint's signing secret.
3. Check Sentry for errors from the webhook handler.

**Resolution:** Stripe retries failed webhooks for 72 hours. Fix the handler and let Stripe retry, or manually trigger from the Stripe dashboard.

---

## 6. Contact and Escalation

| Role | Responsibility |
|---|---|
| On-call engineer | First responder for P0/P1 |
| Engineering lead | Escalation for P0 unresolved > 30 min |
| Vercel support | Infrastructure issues beyond our control |
| Supabase support | Database issues beyond our control |

> **Child data privacy note:** When describing incidents, refer to affected users as "parents" or "families" with counts, never by name or account identifiers.
