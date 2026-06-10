"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Star,
  LayoutDashboard,
  Users,
  ClipboardList,
  CheckSquare,
  Gift,
  Activity,
  Settings,
  Sparkles,
} from "lucide-react"

const navItems = [
  { href: "/parent/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/parent/children", label: "Children", icon: Users },
  { href: "/parent/chores", label: "Chores", icon: ClipboardList },
  { href: "/parent/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/parent/rewards", label: "Rewards", icon: Gift },
  { href: "/parent/activity", label: "Activity", icon: Activity },
  { href: "/parent/ai", label: "AI Helper", icon: Sparkles },
  { href: "/parent/settings", label: "Settings", icon: Settings },
]

export function ParentSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-white shrink-0">
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
          <Star className="w-5 h-5 text-white fill-white" />
        </div>
        <span className="font-bold text-lg text-foreground">Kids Xtra</span>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t">
        <Link
          href="/kid/select"
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-violet-500 to-indigo-500 text-white hover:opacity-90 transition-opacity"
        >
          <Star className="w-4 h-4 fill-white" />
          Switch to Kid Mode
        </Link>
      </div>
    </aside>
  )
}
