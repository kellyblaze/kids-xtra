/**
 * Soak Test — 07
 * Purpose: Detect memory leaks and gradual latency degradation under
 *          sustained moderate load over 30 minutes.
 * VUs: 25 sustained for 30 minutes
 *
 * Failure signature: p95 latency that climbs monotonically over time,
 * or error rate that increases after the first few minutes.
 *
 * STAGING ONLY — never run against production.
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { trend, rate } from 'k6/metrics'
import { url, THINK_TIME } from '../config.js'
import { parentLogin, withAuth } from '../helpers/auth.js'

// Track latency in 5-minute buckets to detect gradual degradation
const earlyLatency = new trend('latency_early_phase')   // first 10 min
const lateLatency = new trend('latency_late_phase')     // last 10 min
const errorRate = new rate('sustained_error_rate')

export const options = {
  vus: 25,
  duration: '30m',
  thresholds: {
    // Overall error rate below 1% across the full 30 minutes
    'http_req_failed': ['rate<0.01'],
    'sustained_error_rate': ['rate<0.01'],
    // p95 must remain below 1s throughout
    'http_req_duration': ['p(95)<1000'],
    // Late-phase latency should not be meaningfully worse than early-phase
    // (k6 cannot compare trend metrics directly; monitor via Grafana)
    'latency_late_phase': ['p(95)<1200'],
    'checks': ['rate>0.98'],
  },
}

// Rough phase tracking: each VU runs iterations, track elapsed loosely
// For accurate phase-based metrics, export to Grafana InfluxDB.
let iterationCount = 0

export default function () {
  const email = __ENV.K6_PARENT_EMAIL
  const password = __ENV.K6_PARENT_PASSWORD

  if (!email || !password) {
    console.error('[07] K6_PARENT_EMAIL and K6_PARENT_PASSWORD must be set')
    return
  }

  iterationCount++
  // Approximate: first ~200 iterations per VU are "early", rest are "late"
  const isEarly = iterationCount < 200

  const auth = parentLogin(email, password)
  if (!auth) {
    errorRate.add(1)
    return
  }

  sleep(THINK_TIME.short)

  group('sustained_parent_cycle', () => {
    const start = Date.now()

    // Dashboard
    const dashboard = http.get(url('/parent/dashboard'), {
      ...withAuth(auth),
      tags: { name: 'soak_dashboard' },
    })
    const dashLatency = Date.now() - start

    const ok = check(dashboard, {
      'soak dashboard 200': (r) => r.status === 200,
      'soak dashboard not 5xx': (r) => r.status < 500,
    })

    errorRate.add(!ok ? 1 : 0)

    if (isEarly) {
      earlyLatency.add(dashLatency)
    } else {
      lateLatency.add(dashLatency)
    }

    sleep(THINK_TIME.medium)

    // Approvals
    const approvals = http.get(url('/parent/approvals'), {
      ...withAuth(auth),
      tags: { name: 'soak_approvals' },
    })
    check(approvals, {
      'soak approvals 200': (r) => r.status === 200,
    })

    sleep(THINK_TIME.medium)

    // Children list (involves DB query)
    const children = http.get(url('/parent/children'), {
      ...withAuth(auth),
      tags: { name: 'soak_children' },
    })
    check(children, {
      'soak children 200': (r) => r.status === 200,
    })

    sleep(THINK_TIME.long)
  })
}

export function teardown() {
  console.log('[07] Soak test complete.')
  console.log('     Compare latency_early_phase p95 vs latency_late_phase p95.')
  console.log('     A >20% increase in late-phase p95 may indicate a memory leak or connection exhaustion.')
}
