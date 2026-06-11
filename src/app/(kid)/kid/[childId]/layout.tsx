import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { verifyKidSession } from "@/lib/kid-session"
import { KID_SESSION_COOKIE, kidLogout } from "@/app/actions/kid-auth"
import { AVATAR_EMOJI } from "@/lib/constants"

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ childId: string }>
}

export default async function KidSessionLayout({ children, params }: LayoutProps) {
  const { childId } = await params
  const cookieStore = await cookies()

  const kidToken = cookieStore.get(KID_SESSION_COOKIE)?.value
  const kidSession = kidToken ? verifyKidSession(kidToken) : null

  let isParentSession = false
  if (!kidSession) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/kids")
    isParentSession = true
  }

  const admin = createAdminClient()
  const { data: child } = await admin
    .from("child_profiles")
    .select("id, name, avatar_key, credit_balance, level, family_id")
    .eq("id", childId)
    .eq("is_active", true)
    .single()

  if (!child) redirect(isParentSession ? "/kid/select" : "/kids")

  if (kidSession && kidSession.familyId !== child.family_id) redirect("/kids")

  const emoji = AVATAR_EMOJI[child.avatar_key ?? "star"] ?? "⭐"

  const navItems = [
    { href: `/kid/${childId}/dashboard`, emoji: "🏠", label: "Home" },
    { href: `/kid/${childId}/missions`, emoji: "🗂️", label: "Missions" },
    { href: `/kid/${childId}/rewards`, emoji: "🎁", label: "Rewards" },
  ]

  return (
    <div className="min-h-screen flex flex-col pb-24 bg-slate-50">
      <header className="sticky top-0 z-10 bg-white border-b-4 border-violet-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-100 border-2 border-violet-200 flex items-center justify-center text-xl">
            {emoji}
          </div>
          <div>
            <p className="font-black text-sm text-slate-800 leading-tight">{child.name}</p>
            <p className="text-xs font-bold text-slate-400">Level {child.level ?? 1}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-amber-50 border-2 border-amber-200 rounded-full px-3 py-1.5 shadow-[0_2px_0_#fde68a]">
            <span className="text-base">⭐</span>
            <span className="font-black text-amber-700 text-sm">{child.credit_balance ?? 0}</span>
          </div>
          {!isParentSession && (
            <form action={kidLogout}>
              <button type="submit" className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1 rounded-xl hover:bg-slate-100 transition-colors">
                Exit
              </button>
            </form>
          )}
          {isParentSession && (
            <Link href="/parent/dashboard" className="text-xs font-bold text-violet-600 hover:text-violet-800 px-2 py-1 rounded-xl hover:bg-violet-50 transition-colors">
              ← Parent
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-5">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t-4 border-slate-100 flex">
        {navItems.map(({ href, emoji: navEmoji, label }) => (
          <Link key={href} href={href}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-slate-400 hover:text-violet-600 transition-colors">
            <span className="text-2xl">{navEmoji}</span>
            <span className="text-xs font-black">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
