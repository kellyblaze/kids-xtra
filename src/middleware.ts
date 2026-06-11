import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { verifyKidSession } from '@/lib/kid-session'
import { KID_SESSION_COOKIE } from '@/lib/kid-session-constants'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
  const { pathname } = request.nextUrl

  const kidToken = request.cookies.get(KID_SESSION_COOKIE)?.value
  const kidSession = kidToken ? await verifyKidSession(kidToken) : null

  // Kid routes: valid kid session OR parent Supabase session
  if (pathname.startsWith('/kid/')) {
    if (!kidSession && !user) {
      return NextResponse.redirect(new URL('/kids', request.url))
    }
    // Prevent a kid session from accessing another child's routes
    if (kidSession && !user) {
      const parts = pathname.split('/')
      const childIdInPath = parts[2]
      if (childIdInPath && childIdInPath !== 'select' && childIdInPath !== kidSession.childId) {
        return NextResponse.redirect(new URL(`/kid/${kidSession.childId}/dashboard`, request.url))
      }
    }
    return supabaseResponse
  }

  // Parent/admin routes: Supabase session required — kid session alone is not enough
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

  // Redirect kids with a valid session away from the kids login page
  if (kidSession && pathname === '/kids') {
    return NextResponse.redirect(new URL(`/kid/${kidSession.childId}/dashboard`, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
