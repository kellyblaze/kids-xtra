import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  if (pathname === '/admin/health' || pathname.startsWith('/admin/health/')) {
    const password = process.env.ADMIN_HEALTH_PASSWORD
    if (!password) {
      return new NextResponse('Not found', {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    if (!isAdminHealthAuthorized(request, password)) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Kids Xtra Health", charset="UTF-8"',
          'Cache-Control': 'no-store',
        },
      })
    }

    return NextResponse.next()
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Parent/admin routes: Supabase session required
  if (pathname.startsWith('/parent') || pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return supabaseResponse
  }

  // Redirect authenticated parents away from auth pages
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/parent/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

function isAdminHealthAuthorized(request: NextRequest, password: string): boolean {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Basic ')) return false

  let decoded = ''
  try {
    decoded = atob(authorization.slice('Basic '.length))
  } catch {
    return false
  }

  const separatorIndex = decoded.indexOf(':')
  if (separatorIndex < 0) return false

  const username = decoded.slice(0, separatorIndex)
  const submittedPassword = decoded.slice(separatorIndex + 1)
  const expectedUsername = process.env.ADMIN_HEALTH_USERNAME ?? 'admin'

  return (
    constantTimeEqual(username, expectedUsername) &&
    constantTimeEqual(submittedPassword, password)
  )
}

function constantTimeEqual(left: string, right: string): boolean {
  const maxLength = Math.max(left.length, right.length)
  let diff = left.length ^ right.length

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0)
  }

  return diff === 0
}
