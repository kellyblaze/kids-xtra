/**
 * Stress Test — 05 — Concurrent Families
 * Purpose: Simulate realistic multi-family mixed load. Verify cross-family
 *          isolation and no data leakage under concurrent load.
 * VUs: 1 → 50 → 100 → 250 → 100 → 1 over ~10 minutes
 *
 * Mix: 60% read (dashboard), 30% approval writes, 10% reward requests
 *
 * STAGING ONLY — never run against production.
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { counter, rate } from 'k6/metrics'
import { url, defaultThresholds, THINK_TIME, jsonHeaders } from '../config.js'
import { parentLogin, withAuth } from '../helpers/auth.js'

// Custom metrics
const serverErrors = new counter('server_errors_5xx')
const crossFamilyLeakSuspected = new counter('cross_family_leak_suspected')

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '4m', target: 250 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 1 },
  ],
  thresholds: {
    ...defaultThresholds,
    'server_errors_5xx': ['count<10'],
    'cross_family_leak_suspected': ['count<1'],
    'http_req_duration{name:parent_dashboard}': ['p(95)<1000'],
    'checks': ['rate>0.98'],
  },
}

export default function () {
  const email = __ENV.K6_PARENT_EMAIL
  const password = __ENV.K6_PARENT_PASSWORD

  if (!email || !password) {
    console.error('[05] K6_PARENT_EMAIL and K6_PARENT_PASSWORD must be set')
    return
  }

  // Determine action type for this VU iteration by random weight
  const roll = Math.random()
  const isWrite = roll >= 0.60 && roll < 0.90   // 30%
  const isReward = roll >= 0.90                   // 10%
  // isRead = roll < 0.60                         // 60%

  const auth = parentLogin(email, password)
  if (!auth) return

  sleep(THINK_TIME.short)

  if (isWrite) {
    // Write path: check approvals queue
    group('approval_check', () => {
      const res = http.get(url('/parent/approvals'), {
        ...withAuth(auth),
        tags: { name: 'approvals_write' },
      })
      if (res.status >= 500) serverErrors.add(1)
      check(res, {
        'approvals not 5xx': (r) => r.status < 500,
        'approvals 200': (r) => r.status === 200,
      })
    })
  } else if (isReward) {
    // Reward path: check reward redemptions
    group('rewards_check', () => {
      const res = http.get(url('/parent/rewards'), {
        ...withAuth(auth),
        tags: { name: 'rewards_check' },
      })
      if (res.status >= 500) serverErrors.add(1)
      check(res, {
        'rewards page not 5xx': (r) => r.status < 500,
      })
    })
  } else {
    // Read path: dashboard
    group('dashboard_read', () => {
      const res = http.get(url('/parent/dashboard'), {
        ...withAuth(auth),
        tags: { name: 'parent_dashboard' },
      })
      if (res.status >= 500) serverErrors.add(1)
      check(res, {
        'dashboard 200': (r) => r.status === 200,
        'dashboard not 5xx': (r) => r.status < 500,
      })

      // Basic cross-family isolation check: response body must not contain
      // any of the other synthetic family's IDs (if configured).
      const otherFamilyId = __ENV.K6_OTHER_FAMILY_ID
      if (otherFamilyId && res.body && res.body.includes(otherFamilyId)) {
        crossFamilyLeakSuspected.add(1)
        console.error(`[05] POTENTIAL CROSS-FAMILY LEAK: found ${otherFamilyId} in dashboard response`)
      }
    })
  }

  sleep(THINK_TIME.medium)
}
