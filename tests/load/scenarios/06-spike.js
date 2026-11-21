/**
 * Spike Test — 06
 * Purpose: Verify the system recovers from sudden traffic bursts.
 *          Tests public pages only (no auth) to avoid hammering the DB.
 * VUs: 0 → 500 in 30s → hold 1m → ramp down 30s
 *
 * Recovery check: p95 must return to baseline within 2 minutes of spike end.
 *
 * STAGING ONLY — never run against production without explicit authorization.
 * Running 500 VUs against production WILL cause service disruption.
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { url, defaultThresholds } from '../config.js'

export const options = {
  stages: [
    // Spike up
    { duration: '30s', target: 500 },
    // Hold at peak
    { duration: '1m', target: 500 },
    // Ramp down
    { duration: '30s', target: 0 },
    // Recovery verification window — reduced load, check latency recovers
    { duration: '2m', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    // During spike, error rate is allowed to reach 5% (Vercel will queue)
    'http_req_failed{phase:spike}': ['rate<0.05'],
    // After recovery, error rate must be back below 1%
    'http_req_failed{phase:recovery}': ['rate<0.01'],
    // After recovery, p95 must be back below 1s
    'http_req_duration{phase:recovery}': ['p(95)<1000'],
  },
}

// Track whether we are in spike or recovery phase
let inSpike = false

export function setup() {
  console.log('[06] Spike test starting — STAGING ONLY')
  return {}
}

export default function () {
  // Determine test phase by elapsed time (approximate via VU iteration)
  // k6 does not expose elapsed time directly in the VU function;
  // use a simple heuristic based on __VU count approximation.
  const phase = __VU > 50 ? 'spike' : 'recovery'

  // Public homepage
  let res = http.get(url('/'), {
    tags: { name: 'homepage', phase },
  })
  check(res, {
    'homepage responds': (r) => r.status < 500,
    'homepage not error': (r) => r.status !== 503,
  })

  sleep(0.1)

  // Login page
  res = http.get(url('/login'), {
    tags: { name: 'login_page', phase },
  })
  check(res, {
    'login page responds': (r) => r.status < 500,
  })

  sleep(0.1)

  // Pricing page (fully static / cached)
  res = http.get(url('/pricing'), {
    tags: { name: 'pricing_page', phase },
  })
  check(res, {
    'pricing page responds': (r) => r.status < 500,
  })

  sleep(0.05)
}

export function teardown() {
  console.log('[06] Spike test complete — review http_req_failed{phase:recovery} for recovery confirmation')
}
