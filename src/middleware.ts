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

function checkAdminAuth(request: NextRequest): NextResponse | null {
  const password = process.env.ADMIN_HEALTH_PASSWORD
  if (!password) return null // not configured — allow (dev environment)
  const authHeader = request.headers.get("authorization") ?? ""
  const [scheme, credentials] = authHeader.split(" ")
  if (scheme?.toLowerCase() === "basic" && credentials) {
    const decoded = Buffer.from(credentials, "base64").toString("utf-8")
    const colonIdx = decoded.indexOf(":")
    const suppliedPassword = colonIdx >= 0 ? decoded.slice(colonIdx + 1) : decoded
    const passwordBuf = Buffer.from(password)
    const suppliedBuf = Buffer.from(suppliedPassword)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    if (suppliedBuf.length === passwordBuf.length && require("crypto").timingSafeEqual(suppliedBuf, passwordBuf)) {
      return null // authorized
    }
  }
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="KidsXtra Admin"' },
  })
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const authError = checkAdminAuth(request)
    if (authError) return authError
  }

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
