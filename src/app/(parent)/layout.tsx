import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getParentUser } from "@/lib/parent-auth"
import { ParentSidebar } from "@/components/layout/ParentSidebar"
import { ParentTopbar } from "@/components/layout/ParentTopbar"
import { hasSubscriptionAccess } from "@/lib/stripe"

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const user = await getParentUser()

  if (!user) redirect("/login")

  const supabase = await createClient()

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("*, families(name, subscription_status)")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/setup")

  const family = Array.isArray(profile.families) ? profile.families[0] : profile.families
  if (!hasSubscriptionAccess(family?.subscription_status)) redirect("/parent/billing")

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <ParentSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <ParentTopbar profile={profile} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
