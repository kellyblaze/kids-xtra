# KidsXtra Release Safety

**Last updated:** 2026-11-21

---

## 1. Release Principles

1. **Every production deployment must pass CI** — no manual overrides except declared incidents.
2. **Health probe must pass** — Vercel blocks the rollout if `/api/health` returns non-2xx.
3. **Breaking DB changes are staged** — schema migrations run before code deploys; never the reverse.
4. **One change per PR** — mixing schema + feature + refactor in one deploy makes rollback harder.
5. **Rollback is always available** — the previous deployment stays in Vercel's history for instant promotion.

---

## 2. Pre-Deploy Checklist

Before merging to `main` / triggering a production deploy:

- [ ] CI passes: type-check, lint, unit tests (if present)
- [ ] `/api/health` probe is healthy on staging
- [ ] No `console.log` statements in changed files
- [ ] No hardcoded secrets or credentials
- [ ] Environment variable changes documented and added to Vercel
- [ ] DB migration (if any) reviewed and tested on a branch database
- [ ] Feature tested end-to-end on staging — parent flow AND kid flow
- [ ] Reviewer approval obtained (for changes to auth, payments, or child data)

---

## 3. CI/CD Pipeline

The GitHub Actions pipeline (`.github/workflows/ci.yml`) runs on every push and PR:

| Step | What it checks |
|---|---|
| `pnpm install` | Lockfile integrity |
| `pnpm run type-check` | TypeScript strict mode |
| `pnpm run lint` | ESLint rules |
| `pnpm run build` | Next.js production build |
| `pnpm test` (when tests exist) | Unit and integration tests |

Vercel deploys automatically from `main` once all checks pass.

**Deployment flow:**

```
PR opened → CI runs → Preview deployment → Manual review → Merge to main → Production deploy → Health check
```

---

## 4. Database Migration Safety

Migrations live in `supabase/migrations/`. They are run via Supabase CLI or through the Supabase dashboard.

### Safe Migration Patterns

| Operation | Safe? | Notes |
|---|---|---|
| Add nullable column | ✅ Yes | Zero downtime |
| Add column with default | ✅ Yes | Supabase fills existing rows |
| Add index | ✅ Yes | Use `CONCURRENTLY` on large tables |
| Add new table | ✅ Yes | No impact on existing code |
| Rename column | ⚠️ Staged | Add new column → backfill → remove old (3 deploys) |
| Remove column | ⚠️ Staged | Remove from code first, then drop (2 deploys) |
| Change column type | ⚠️ Careful | Requires a full migration with data transformation |
| Add NOT NULL constraint | ⚠️ Staged | Backfill nulls before adding constraint |
| Drop table | 🚫 Dangerous | Verify no code references it; take a snapshot first |

### Migration Deployment Order

**Always:** run the migration **before** deploying the new application code.

If the migration adds a column that the new code reads:
1. Run migration → column now exists (old code ignores it)
2. Deploy new code → code now reads the column

If the migration removes a column that the old code reads:
1. Deploy new code without the column reference → old code path removed
2. Run migration → column now dropped

---

## 5. Environment Variable Changes

When a new environment variable is required:

1. Add it to `.env.example` with a placeholder value and a comment.
2. Add it to Vercel: **Dashboard → Settings → Environment Variables**.
3. Set it for `Production`, `Preview`, and `Development` environments as appropriate.
4. Document it in the relevant runbook (`MONITORING_SETUP.md`, `AUTOMATED_RECOVERY.md`, etc.).

**Never commit real values** to `.env.example` or any file tracked by git.

Variables added to `.env.example` in this project:

| Variable | Required | Added in |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Initial setup |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Initial setup |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server only) | Initial setup |
| `KID_SESSION_SECRET` | Yes | Initial setup |
| `CRON_SECRET` | Yes | Initial setup |
| `RESEND_API_KEY` | Yes | Initial setup |
| `STRIPE_SECRET_KEY` | Yes | Initial setup |
| `STRIPE_WEBHOOK_SECRET` | Yes | Initial setup |
| `STRIPE_PRICE_ID` | Yes | Initial setup |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Yes | Push notifications |
| `VAPID_PRIVATE_KEY` | Yes | Push notifications |
| `VAPID_EMAIL` | Yes | Push notifications |
| `ADMIN_HEALTH_PASSWORD` | Yes | Phase 1 P0 fix |
| `ADMIN_HEALTH_USERNAME` | No (default: "admin") | Phase 1 P0 fix |
| `NEXT_PUBLIC_SENTRY_DSN` | Recommended | Phase 3 |
| `SENTRY_DSN` | Recommended | Phase 3 |
| `SENTRY_AUTH_TOKEN` | CI only | Phase 3 |
| `SENTRY_ORG` | CI only | Phase 3 |
| `SENTRY_PROJECT` | CI only | Phase 3 |

---

## 6. Staged Rollout

Vercel does not natively support canary deployments on the Hobby plan. For gradual rollouts:

1. Deploy to a **preview URL** first and share it with internal testers.
2. Promote to production only after the preview looks healthy.
3. Use Vercel's **Deployment Protection** to restrict preview access to your team.

---

## 7. Post-Deploy Verification

Within 10 minutes of every production deploy:

1. `curl -s https://kidsxtra.cc/api/health | jq .` — verify `ok: true`.
2. Load `/parent/dashboard` in a browser — verify no JS errors in console.
3. Check Sentry for any new errors from the last 10 minutes.
4. Check Vercel Function logs for any 500 errors.

If any check fails, trigger a rollback immediately (see `INCIDENT_RESPONSE.md §4`).

---

## 8. Freeze Periods

Avoid production deployments:

- **Friday after 3 PM** through **Monday 10 AM** — reduced engineer availability.
- During parent-facing events (school holidays, back-to-school weeks) when usage spikes.
- Within 2 hours of a previous deployment (give health checks time to validate).

For urgent security fixes, exceptions are allowed with explicit team sign-off.
