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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-violet-700">Who&apos;s playing?</h1>
          <p className="text-muted-foreground mt-2">Tap your name to see your missions</p>
        </div>

        <div className="grid gap-4">
          {children.map((child) => {
            const emoji = AVATAR_EMOJI[child.avatar_key ?? "star"] ?? "⭐"
            const theme = COLOR_THEMES.find((t) => t.value === child.color_theme)
            const bg = theme?.bg ?? "bg-violet-100"
            const text = theme?.text ?? "text-violet-700"

            return (
              <Link
                key={child.id}
                href={`/kid/${child.id}/dashboard`}
                className={`flex items-center gap-4 p-5 rounded-2xl ${bg} hover:opacity-90 active:scale-95 transition-all cursor-pointer`}
              >
                <div className="w-16 h-16 rounded-full bg-white/60 flex items-center justify-center text-4xl shrink-0 shadow-sm">
                  {emoji}
                </div>
                <div>
                  <p className={`text-2xl font-bold ${text}`}>{child.name}</p>
                  <p className={`text-sm font-medium ${text} opacity-80`}>
                    ⭐ {child.credit_balance ?? 0} credits · Level {child.level ?? 1}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/parent/dashboard" className="underline underline-offset-2">
            Back to parent view
          </Link>
        </p>
      </div>
    </div>
  )
}
