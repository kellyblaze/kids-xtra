/**
 * Load Test — 02 — Parent Login & Dashboard
 * Purpose: Baseline load on the most-used parent flow.
 * VUs: 1 → 25 → 50 → 100 → 50 → 1 over ~5 minutes
 *
 * Flow per VU: login → dashboard → approvals → logout
 *
 * STAGING ONLY — never run against production.
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { url, defaultThresholds, THINK_TIME } from '../config.js'
import { parentLogin, withAuth } from '../helpers/auth.js'

export const options = {
  stages: [
    { duration: '30s', target: 25 },
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 1 },
  ],
  thresholds: {
    ...defaultThresholds,
    'http_req_duration{name:parent_dashboard}': ['p(95)<800'],
    'http_req_duration{name:approvals}': ['p(95)<1000'],
    'checks': ['rate>0.99'],
  },
}

export default function () {
  const email = __ENV.K6_PARENT_EMAIL
  const password = __ENV.K6_PARENT_PASSWORD

  if (!email || !password) {
    console.error('[02] K6_PARENT_EMAIL and K6_PARENT_PASSWORD must be set')
    return
  }

  group('parent_login_flow', () => {
    // Authenticate
    const auth = parentLogin(email, password)
    if (!auth) {
      console.error('[02] Authentication failed — skipping iteration')
      return
    }

    sleep(THINK_TIME.short)

    // Dashboard
    const dashboard = http.get(url('/parent/dashboard'), {
      ...withAuth(auth),
      tags: { name: 'parent_dashboard' },
    })
    check(dashboard, {
      'dashboard status 200': (r) => r.status === 200,
      'dashboard not 5xx': (r) => r.status < 500,
    })

    sleep(THINK_TIME.medium)

    // Approvals queue
    const approvals = http.get(url('/parent/approvals'), {
      ...withAuth(auth),
      tags: { name: 'approvals' },
    })
    check(approvals, {
      'approvals status 200': (r) => r.status === 200,
      'approvals not 5xx': (r) => r.status < 500,
    })

    sleep(THINK_TIME.short)

    // Children list
    const children = http.get(url('/parent/children'), {
      ...withAuth(auth),
      tags: { name: 'children_list' },
    })
    check(children, {
      'children list 200': (r) => r.status === 200,
    })

    sleep(THINK_TIME.medium)
  })
}
