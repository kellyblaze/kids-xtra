import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { AVATAR_EMOJI } from "@/lib/constants"
import { Home, Star, Gift } from "lucide-react"

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ childId: string }>
}

export default async function KidSessionLayout({ children, params }: LayoutProps) {
  const { childId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, name, avatar_key, credit_balance, level, family_id")
    .eq("id", childId)
    .eq("is_active", true)
    .single()

  if (!child) redirect("/kid/select")

  const { data: parentProfile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()

  if (!parentProfile || parentProfile.family_id !== child.family_id) {
    redirect("/kid/select")
  }

  const emoji = AVATAR_EMOJI[child.avatar_key ?? "star"] ?? "⭐"

  const navItems = [
    { href: `/kid/${childId}/dashboard`, icon: Home, label: "Home" },
    { href: `/kid/${childId}/missions`, icon: Star, label: "Missions" },
    { href: `/kid/${childId}/rewards`, icon: Gift, label: "Rewards" },
  ]

  return (
    <div className="min-h-screen flex flex-col pb-20">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <div>
            <p className="font-bold text-sm leading-tight">{child.name}</p>
            <p className="text-xs text-muted-foreground">Level {child.level ?? 1}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
          <span className="text-amber-500 text-sm">⭐</span>
          <span className="font-bold text-amber-700 text-sm">{child.credit_balance ?? 0}</span>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t flex">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-muted-foreground hover:text-primary transition-colors"
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
