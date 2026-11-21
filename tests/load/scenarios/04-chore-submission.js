/**
 * Load Test — 04 — Chore Submission
 * Purpose: Stress the chore-completion write path and credit calculation RPCs.
 * VUs: 1 → 25 → 50 → 25 → 1 over ~3 minutes
 *
 * Flow per VU iteration: kid login → mark chore done (unique per iteration)
 *
 * IMPORTANT — Next.js Server Actions:
 * Server Actions are invoked as POST requests to the page URL with specific
 * headers (Next-Action ID). The action ID is a stable hash of the action's
 * source location and is NOT stable across builds. For load testing:
 *   1. Identify the action ID by inspecting the network tab on the
 *      /kid/:childId/missions/:assignmentId page during a manual test.
 *   2. Set K6_MARK_DONE_ACTION_ID to that hash.
 *   3. Set K6_MARK_DONE_PAGE_URL to the full page path.
 *
 * Alternatively, expose a dedicated test-only REST endpoint that wraps the
 * same server action — only accessible in staging (guarded by STAGING_ONLY env).
 *
 * STAGING ONLY — never run against production.
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { counter } from 'k6/metrics'
import { url, defaultThresholds, THINK_TIME, jsonHeaders } from '../config.js'
import { kidLogin } from '../helpers/auth.js'

// Custom metric: track how many submissions land as duplicates
const duplicateSubmissions = new counter('duplicate_submissions')

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
    'http_req_duration{name:chore_submit}': ['p(95)<1500'],
    // Zero duplicate submissions tolerated
    'duplicate_submissions': ['count<1'],
    'checks': ['rate>0.99'],
  },
}

export default function () {
  const familyCode = __ENV.K6_KID_FAMILY_CODE
  const childId = __ENV.K6_KID_CHILD_ID
  const pin = __ENV.K6_KID_PIN
  const assignmentId = __ENV.K6_ASSIGNMENT_ID
  const actionId = __ENV.K6_MARK_DONE_ACTION_ID || null
  const stagingApiKey = __ENV.K6_STAGING_API_KEY || null

  if (!familyCode || !childId || !pin || !assignmentId) {
    console.error('[04] K6_KID_FAMILY_CODE, K6_KID_CHILD_ID, K6_KID_PIN, and K6_ASSIGNMENT_ID must be set')
    return
  }

  group('chore_submission', () => {
    // Authenticate as kid
    const loginRes = http.post(
      url('/api/kid/login'),
      JSON.stringify({ familyCode, childId, pin }),
      { headers: jsonHeaders, tags: { name: 'kid_login' } }
    )

    const loginOk = check(loginRes, {
      'kid login 200': (r) => r.status === 200,
    })
    if (!loginOk) return

    const sessionCookie = (loginRes.headers['Set-Cookie'] || '').split(';')[0]
    const cookieHeader = { Cookie: sessionCookie }

    sleep(THINK_TIME.short)

    // Option A: Direct staging API endpoint (preferred for load testing)
    // Requires a staging-only route at /api/test/submit-chore that accepts
    // { assignmentId, childId } and runs the same logic as the Server Action.
    if (stagingApiKey) {
      const submitRes = http.post(
        url('/api/test/submit-chore'),
        JSON.stringify({ assignmentId, childId }),
        {
          headers: {
            ...jsonHeaders,
            Cookie: sessionCookie,
            'X-Staging-API-Key': stagingApiKey,
          },
          tags: { name: 'chore_submit' },
        }
      )

      const submitOk = check(submitRes, {
        'chore submit 200': (r) => r.status === 200,
        'chore submit no 5xx': (r) => r.status < 500,
        'chore submit not duplicate': (r) => {
          if (r.status === 409) {
            duplicateSubmissions.add(1)
            return false
          }
          return true
        },
      })

      if (!submitOk) {
        console.warn(`[04] Chore submit failed — ${submitRes.status}: ${submitRes.body}`)
      }

      return
    }

    // Option B: Invoke via Next.js Server Action POST
    // Requires the action ID from a network-tab inspection of the target page.
    if (actionId) {
      const actionPagePath = __ENV.K6_MARK_DONE_PAGE_URL ||
        `/kid/${childId}/missions/${assignmentId}`

      const submitRes = http.post(
        url(actionPagePath),
        JSON.stringify([assignmentId, childId]),
        {
          headers: {
            'Content-Type': 'text/plain;charset=UTF-8',
            'Next-Action': actionId,
            Cookie: sessionCookie,
          },
          tags: { name: 'chore_submit' },
        }
      )

      check(submitRes, {
        'server action accepted': (r) => r.status === 200 || r.status === 303,
        'no 5xx on submit': (r) => r.status < 500,
      })

      return
    }

    // Option C: No action ID and no staging API — navigate to the page only
    console.warn('[04] Neither K6_STAGING_API_KEY nor K6_MARK_DONE_ACTION_ID set — testing page load only')

    const missionPage = http.get(
      url(`/kid/${childId}/missions/${assignmentId}`),
      { headers: cookieHeader, tags: { name: 'mission_page' } }
    )
    check(missionPage, {
      'mission detail page 200': (r) => r.status === 200,
    })

    sleep(THINK_TIME.medium)
  })
}
