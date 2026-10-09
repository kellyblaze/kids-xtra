# KidsXtra VPS Migration Plan

This document captures the future plan for moving KidsXtra hosting from Vercel to a VPS while keeping the current Supabase, Stripe, Resend, and AI service integrations intact.

## Goal

Move the Next.js application runtime from Vercel to a VPS with a controlled, reversible rollout.

The first migration should only replace Vercel app hosting. Supabase, Stripe, Resend, Anthropic, and other external services should stay unchanged unless a separate migration is planned.

## Current Vercel Responsibilities

Vercel currently provides:

- Next.js production build and Node runtime.
- Public HTTPS hosting.
- Static asset hosting.
- Next image optimization and caching.
- Production environment variables.
- GitHub deployment from `main`.
- Cron execution from `vercel.json`:
  - `/api/tasks/send-weekly-report`
  - `/api/tasks/send-chore-reminders`

The VPS migration needs a replacement for each item above.

## Recommended VPS Stack

Use a simple Node-based deployment:

- Ubuntu 22.04 or 24.04 LTS.
- Node.js LTS.
- npm.
- Git.
- Caddy or Nginx as the reverse proxy.
- PM2 or systemd to keep the app process running.
- Let’s Encrypt TLS.
- 2 GB or more RAM preferred for reliable `next build`.

Caddy is the easiest reverse proxy option because HTTPS is automatic.

Example Caddy shape:

```caddyfile
kidsxtra.com {
  reverse_proxy localhost:3000
}
```

## Runtime Commands

The existing app can run as a normal Next.js Node server:

```bash
npm ci
npm run build
npm run start
```

The app should run on an internal port such as `3000`, with Caddy or Nginx serving public traffic on `443`.

## Environment Variables

Export the production variables from Vercel and recreate them on the VPS.

Expected variables include:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_APP_URL=
CRON_SECRET=
```

`NEXT_PUBLIC_APP_URL` must be updated to the production VPS domain.

Do not commit secrets to the repository. Store them in the process manager environment, a protected `.env.production` on the VPS, or a secret manager.

## Cron Replacement

Vercel cron jobs must be moved to VPS cron, systemd timers, or an external scheduler.

Current jobs:

```bash
0 9 * * 1 /api/tasks/send-weekly-report
0 17 * * * /api/tasks/send-chore-reminders
```

Before cutover, verify the exact auth expected by the cron routes. If they use a bearer secret, the VPS cron should call:

```bash
0 9 * * 1 curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://kidsxtra.com/api/tasks/send-weekly-report
0 17 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://kidsxtra.com/api/tasks/send-chore-reminders
```

If the app expects a different header or query parameter, update these commands accordingly.

## Deployment Workflow

Start with a manual deploy script, then automate with GitHub Actions after the VPS setup is proven.

Example manual deploy:

```bash
cd /var/www/kids-xtra
git fetch origin
git checkout main
git pull origin main
npm ci
npm run build
pm2 restart kids-xtra
```

PM2 example:

```bash
pm2 start npm --name kids-xtra -- run start
pm2 save
pm2 startup
```

Later, a GitHub Actions workflow can SSH into the VPS and run the same deploy script after `main` passes checks.

## Service Updates

### Stripe

Update the Stripe webhook endpoint to the VPS domain:

```text
https://kidsxtra.com/api/stripe/webhook
```

After changing the endpoint, update `STRIPE_WEBHOOK_SECRET` on the VPS.

### Supabase Auth

Update Supabase Auth URL settings:

- Site URL: `https://kidsxtra.com`
- Additional redirect URLs:
  - `https://kidsxtra.com`
  - `https://www.kidsxtra.com`
  - any staging subdomain used during testing

Do not remove Vercel URLs until rollback is no longer needed.

### DNS

Use a staging subdomain first:

```text
staging.kidsxtra.com -> VPS
```

After validation, move production DNS:

```text
kidsxtra.com -> VPS
www.kidsxtra.com -> VPS
```

## Migration Phases

### Phase 1: Prepare VPS

- Provision server.
- Install Node.js, npm, Git, Caddy or Nginx, and PM2 or systemd service.
- Clone the repository.
- Add production environment variables.
- Build and run the app on an internal port.
- Configure reverse proxy and HTTPS.

### Phase 2: Staging Mirror

- Point `staging.kidsxtra.com` to the VPS.
- Set `NEXT_PUBLIC_APP_URL` to the staging URL for staging tests.
- Add staging URL to Supabase Auth redirects.
- Configure test Stripe webhook endpoint if billing smoke tests are needed.
- Configure cron jobs against staging only if safe.

### Phase 3: Smoke Test

Run the production workflow checklist on staging:

- Home page loads and images render.
- Signup/login works.
- Parent dashboard loads.
- Kid login works.
- Parent creates a child.
- Parent creates a Mission.
- Child completes Mission checklist/photo.
- Parent approves Mission.
- Credits ledger updates.
- Savings goal progress updates.
- Reward redemption works.
- Parent fulfills reward.
- Stripe webhook works if billing is active.
- Weekly report cron endpoint works.
- Mission reminder cron endpoint works.

### Phase 4: Production Cutover

- Set VPS env vars for the production domain.
- Update Stripe webhook endpoint and secret.
- Update Supabase Auth production URL settings.
- Point production DNS to the VPS.
- Confirm HTTPS certificate issuance.
- Run smoke tests on production.

### Phase 5: Stabilization

- Keep Vercel production deployment available as rollback for several days.
- Monitor server logs.
- Monitor app errors and cron execution.
- Confirm email delivery.
- Confirm Stripe webhooks.
- Confirm Supabase auth redirects.

## Rollback Plan

Rollback should be DNS-based:

1. Point production DNS back to Vercel.
2. Restore Stripe webhook endpoint to the Vercel production URL if it was changed.
3. Restore `NEXT_PUBLIC_APP_URL`-dependent settings if needed.
4. Keep the database unchanged unless a separate migration introduced data changes.

The app code should remain compatible with the same Supabase database during rollback.

## Risks

Primary risks:

- Missing or incorrect environment variables.
- Stripe webhook secret mismatch.
- Supabase redirect URL mismatch.
- Cron authentication mismatch.
- VPS memory pressure during `next build`.
- Manual deploy mistakes.
- Less automatic observability than Vercel.
- Stale DNS during cutover.

Mitigations:

- Use staging first.
- Keep Vercel live as rollback.
- Automate deploys after the first successful manual deployment.
- Add log monitoring before cutover.
- Document all env vars and service settings.

## Production Readiness Checklist

- [ ] VPS provisioned and secured.
- [ ] Reverse proxy configured.
- [ ] HTTPS working.
- [ ] App builds successfully on VPS.
- [ ] App runs under PM2 or systemd.
- [ ] Environment variables configured.
- [ ] Supabase Auth URLs updated.
- [ ] Stripe webhook endpoint updated.
- [ ] Cron jobs configured.
- [ ] Staging smoke test passed.
- [ ] Production DNS cutover completed.
- [ ] Production smoke test passed.
- [ ] Rollback path confirmed.
- [ ] Vercel retained temporarily as fallback.
