/**
 * Load Test — 03 — Kid Flow
 * Purpose: Validate kid-session auth and mission list under load.
 * VUs: 1 → 25 → 50 → 25 → 1 over ~3 minutes
 *
 * Flow per VU: kid login → missions list → mission detail → kid dashboard
 *
 * STAGING ONLY — never run against production.
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { url, defaultThresholds, THINK_TIME, jsonHeaders } from '../config.js'
import { kidLogin } from '../helpers/auth.js'

export const options = {
  stages: [
    { duration: '20s', target: 25 },
    { duration: '1m', target: 50 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 25 },
    { duration: '10s', target: 1 },
  ],
  thresholds: {
    ...defaultThresholds,
    'http_req_duration{name:kid_missions}': ['p(95)<800'],
    'checks': ['rate>0.99'],
  },
}

export default function () {
  const familyCode = __ENV.K6_KID_FAMILY_CODE
  const childId = __ENV.K6_KID_CHILD_ID
  const pin = __ENV.K6_KID_PIN

  if (!familyCode || !childId || !pin) {
    console.error('[03] K6_KID_FAMILY_CODE, K6_KID_CHILD_ID, and K6_KID_PIN must be set')
    return
  }

  group('kid_login_flow', () => {
    // Kid login — POST /api/kid/login with family code + PIN
    const loginRes = http.post(
      url('/api/kid/login'),
      JSON.stringify({ familyCode, childId, pin }),
      {
        headers: jsonHeaders,
        tags: { name: 'kid_login' },
      }
    )

    const loginOk = check(loginRes, {
      'kid login 200': (r) => r.status === 200,
      'kid login no 5xx': (r) => r.status < 500,
      'kid login has session': (r) => {
        const setCookie = r.headers['Set-Cookie'] || ''
        return setCookie.length > 0
      },
    })

    if (!loginOk) {
      console.error(`[03] Kid login failed — ${loginRes.status}: ${loginRes.body}`)
      return
    }

    // Extract the session cookie from the response
    const setCookie = loginRes.headers['Set-Cookie'] || ''
    const sessionCookie = setCookie.split(';')[0]
    const cookieHeader = { Cookie: sessionCookie }

    sleep(THINK_TIME.short)

    // Missions list
    const missions = http.get(url(`/kid/${childId}/missions`), {
      headers: cookieHeader,
      tags: { name: 'kid_missions' },
    })
    check(missions, {
      'missions list 200': (r) => r.status === 200,
      'missions list not 5xx': (r) => r.status < 500,
    })

    sleep(THINK_TIME.short)

    // Kid dashboard
    const dashboard = http.get(url(`/kid/${childId}/dashboard`), {
      headers: cookieHeader,
      tags: { name: 'kid_dashboard' },
    })
    check(dashboard, {
      'kid dashboard 200': (r) => r.status === 200,
    })

    sleep(THINK_TIME.medium)

    // Kid rewards page
    const rewards = http.get(url(`/kid/${childId}/rewards`), {
      headers: cookieHeader,
      tags: { name: 'kid_rewards' },
    })
    check(rewards, {
      'kid rewards 200': (r) => r.status === 200,
    })

    sleep(THINK_TIME.short)
  })
}
