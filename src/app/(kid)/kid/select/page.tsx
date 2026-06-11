import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { AVATAR_EMOJI, COLOR_THEMES } from "@/lib/constants"

export default async function ChildSelectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()
  if (!profile) redirect("/login")

  const { data: children } = await supabase
    .from("child_profiles")
    .select("id, name, avatar_key, color_theme, credit_balance, level")
    .eq("family_id", profile.family_id)
    .eq("is_active", true)
    .order("name")

  if (!children?.length) redirect("/parent/children")

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-violet-50 to-white">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="text-6xl mb-4">👋</div>
          <h1 className="text-4xl font-black text-slate-800">Who&apos;s playing?</h1>
          <p className="text-slate-500 font-medium mt-2">Tap your name to see your missions</p>
        </div>

        <div className="grid gap-4">
          {children.map((child) => {
            const emoji = AVATAR_EMOJI[child.avatar_key ?? "star"] ?? "⭐"
            const theme = COLOR_THEMES.find((t) => t.value === child.color_theme)
            const bg = theme?.bg ?? "bg-violet-50"
            const text = theme?.text ?? "text-violet-700"

            return (
              <Link
                key={child.id}
                href={`/kid/${child.id}/dashboard`}
                className={`flex items-center gap-4 p-5 rounded-3xl border-4 border-violet-200 ${bg} shadow-[0_6px_0_#ddd6fe] hover:translate-y-[3px] hover:shadow-[0_3px_0_#ddd6fe] active:translate-y-[6px] active:shadow-none transition-all cursor-pointer`}
              >
                <div className="w-16 h-16 rounded-2xl bg-white/80 border-2 border-white flex items-center justify-center text-4xl shrink-0 shadow-sm">
                  {emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-2xl font-black ${text} truncate`}>{child.name}</p>
                  <p className={`text-sm font-bold opacity-70 ${text}`}>
                    ⭐ {child.credit_balance ?? 0} credits · Level {child.level ?? 1}
                  </p>
                </div>
                <span className="text-2xl">→</span>
              </Link>
            )
          })}
        </div>

        <p className="text-center text-xs font-bold text-slate-400">
          <Link href="/parent/dashboard" className="hover:text-violet-600 transition-colors underline underline-offset-2">
            Back to parent view
          </Link>
        </p>
      </div>
    </div>
  )
}
