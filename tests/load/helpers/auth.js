// Authentication helpers for KidsXtra k6 load tests.
// All credentials must be synthetic staging-only accounts.

import http from 'k6/http'
import { check } from 'k6'
import { url, jsonHeaders } from '../config.js'

/**
 * Log in as a parent using email + password.
 * Returns the Set-Cookie header value to pass as Cookie on subsequent requests,
 * or null if authentication failed.
 *
 * KidsXtra uses Supabase Auth — the sign-in endpoint is the Supabase REST API
 * proxied through the Next.js app or called directly. Adjust the endpoint path
 * if the app routes auth differently.
 */
export function parentLogin(email, password) {
  if (!email || !password) {
    console.error('[auth] parentLogin: email and password are required')
    return null
  }

  // Supabase auth via the anon key — the app's middleware exchanges this for
  // a server-side session cookie. In load tests we call the Supabase token
  // endpoint directly and carry the access token as a Bearer header.
  const supabaseUrl = __ENV.NEXT_PUBLIC_SUPABASE_URL || __ENV.K6_SUPABASE_URL
  const supabaseAnonKey = __ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY || __ENV.K6_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Fallback: attempt login through the app's login page form action.
    // This path may not work if the app uses a redirect flow, but it exercises
    // the full Next.js login path.
    console.warn('[auth] Supabase env vars not set — attempting app-layer login')
    return appLayerLogin(email, password)
  }

  const res = http.post(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email, password }),
    {
      headers: {
        ...jsonHeaders,
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      tags: { type: 'auth' },
    }
  )

  const ok = check(res, {
    'parent login 200': (r) => r.status === 200,
    'parent login has access_token': (r) => {
      try { return !!JSON.parse(r.body).access_token } catch { return false }
    },
  })

  if (!ok) {
    console.error(`[auth] parentLogin failed — status ${res.status}: ${res.body}`)
    return null
  }

  const { access_token } = JSON.parse(res.body)
  return { accessToken: access_token, authHeader: `Bearer ${access_token}` }
}

/**
 * Fallback: login through the app's own login form.
 * Returns a cookies jar object for use in subsequent requests.
 */
function appLayerLogin(email, password) {
  const jar = http.cookieJar()

  const res = http.post(
    url('/login'),
    `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      redirects: 5,
      tags: { type: 'auth' },
      jar,
    }
  )

  const ok = check(res, {
    'app login succeeded (redirected to dashboard)': (r) =>
      r.url.includes('/parent/dashboard') || r.status === 200,
  })

  if (!ok) {
    console.error(`[auth] appLayerLogin failed — final URL: ${res.url}`)
    return null
  }

  return { jar }
}

/**
 * Log in as a child using family code + child ID + PIN.
 * Returns the kid session cookie string on success, null on failure.
 */
export function kidLogin(familyCode, childId, pin) {
  if (!familyCode || !childId || !pin) {
    console.error('[auth] kidLogin: familyCode, childId, and pin are required')
    return null
  }

  const res = http.post(
    url('/api/kid/login'),
    JSON.stringify({ familyCode, childId, pin }),
    {
      headers: jsonHeaders,
      tags: { type: 'auth' },
    }
  )

  const ok = check(res, {
    'kid login 200': (r) => r.status === 200,
    'kid login has session cookie': (r) => {
      const cookies = r.headers['Set-Cookie'] || ''
      return cookies.includes('kid_session') || cookies.includes('session')
    },
  })

  if (!ok) {
    console.error(`[auth] kidLogin failed — status ${res.status}: ${res.body}`)
    return null
  }

  // Extract Set-Cookie header to replay on subsequent requests
  const setCookie = res.headers['Set-Cookie'] || ''
  const sessionCookie = setCookie.split(';')[0] // e.g. "kid_session=eyJ..."
  return sessionCookie
}

/**
 * Build request params with Bearer auth token.
 */
export function withAuth(authResult, extraHeaders = {}) {
  if (!authResult) return { headers: extraHeaders }
  if (authResult.authHeader) {
    return {
      headers: { Authorization: authResult.authHeader, ...extraHeaders },
    }
  }
  if (authResult.jar) {
    return { jar: authResult.jar, headers: extraHeaders }
  }
  return { headers: extraHeaders }
}
