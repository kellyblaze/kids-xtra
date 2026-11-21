// Shared k6 configuration for all KidsXtra load test scenarios.
// Import this file in each scenario: import { BASE_URL, defaultThresholds } from '../config.js'

export const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3000'

if (!__ENV.K6_BASE_URL) {
  console.warn('[config] K6_BASE_URL not set — defaulting to http://localhost:3000')
}

// Acceptance criteria per Phase 2 SRE plan
export const defaultThresholds = {
  // HTTP error rate must stay below 1%
  http_req_failed: ['rate<0.01'],
  // p95 response time must stay below 1 second
  'http_req_duration{expected_response:true}': ['p(95)<1000'],
}

// Scenario-specific thresholds for critical write paths
export const writeThresholds = {
  ...defaultThresholds,
  // Write endpoints get a tighter p99 budget
  'http_req_duration{type:write}': ['p(99)<2000'],
}

// Common sleep durations (seconds) to simulate realistic user think time
export const THINK_TIME = {
  short: 1,
  medium: 2,
  long: 5,
}

// Helper: build a full URL from a path
export function url(path) {
  return `${BASE_URL}${path}`
}

// Helper: common headers for JSON API requests
export const jsonHeaders = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
}

// Helper: Next.js CSRF/action header required for Server Actions
export const actionHeaders = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'Next-Action': '1',
}
