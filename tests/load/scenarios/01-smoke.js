/**
 * Smoke Test — 01
 * Purpose: Quick sanity check after every deployment.
 * VUs: 1 | Duration: ~10 seconds | Iterations: 1
 *
 * Flow: homepage → login page → parent auth → dashboard
 *
 * STAGING ONLY — never run against production.
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { BASE_URL, url, defaultThresholds } from '../config.js'
import { parentLogin, withAuth } from '../helpers/auth.js'

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: defaultThresholds,
}

export default function () {
  const email = __ENV.K6_PARENT_EMAIL
  const password = __ENV.K6_PARENT_PASSWORD

  if (!email || !password) {
    console.error('[smoke] K6_PARENT_EMAIL and K6_PARENT_PASSWORD must be set')
    return
  }

  // 1. Homepage
  let res = http.get(url('/'), { tags: { name: 'homepage' } })
  check(res, { 'homepage 200': (r) => r.status === 200 })
  sleep(0.5)

  // 2. Login page
  res = http.get(url('/login'), { tags: { name: 'login_page' } })
  check(res, { 'login page 200': (r) => r.status === 200 })
  sleep(0.5)

  // 3. Authenticate
  const auth = parentLogin(email, password)
  check(auth, { 'auth succeeded': (a) => a !== null })
  if (!auth) return

  sleep(0.5)

  // 4. Parent dashboard
  res = http.get(url('/parent/dashboard'), {
    ...withAuth(auth),
    tags: { name: 'parent_dashboard' },
  })
  check(res, { 'dashboard 200': (r) => r.status === 200 })

  sleep(0.5)

  // 5. Approvals queue
  res = http.get(url('/parent/approvals'), {
    ...withAuth(auth),
    tags: { name: 'approvals' },
  })
  check(res, { 'approvals 200': (r) => r.status === 200 })

  console.log(`[smoke] BASE_URL=${BASE_URL} — all checks complete`)
}
