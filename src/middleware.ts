import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Buffer.from(bytes).toString("base64")
}

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    "img-src 'self' data: blob: https://images.pexels.com https://*.supabase.co",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ")
}

export async function middleware(request: NextRequest) {
  const nonce = generateNonce()
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh the session — this keeps the JWT alive and writes the updated
  // cookie back to the browser on every request to a protected route.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Redirect unauthenticated visitors away from parent routes
  if (!user && pathname.startsWith("/parent")) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    return NextResponse.redirect(loginUrl)
  }

  supabaseResponse.headers.set("Content-Security-Policy", buildCsp(nonce))
  supabaseResponse.headers.set("x-nonce", nonce)

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
