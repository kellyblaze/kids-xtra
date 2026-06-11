import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ParentSidebar } from "@/components/layout/ParentSidebar"
import { ParentTopbar } from "@/components/layout/ParentTopbar"

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("*, families(name)")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/setup")

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
