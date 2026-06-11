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
} from "lucide-react"

const navItems = [
  { href: "/parent/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/parent/children", label: "Children", icon: Users },
  { href: "/parent/chores", label: "Chores", icon: ClipboardList },
  { href: "/parent/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/parent/rewards", label: "Rewards", icon: Gift },
  { href: "/parent/activity", label: "Activity", icon: Activity },
  { href: "/parent/settings", label: "Settings", icon: Settings },
]

export function ParentSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-64 border-r-4 border-slate-100 bg-white shrink-0">
      <div className="flex items-center gap-2 px-5 py-5 border-b-4 border-slate-100">
        <div className="w-9 h-9 rounded-2xl bg-violet-600 flex items-center justify-center shadow-[0_3px_0_#5b21b6]">
          <Star className="w-5 h-5 text-white fill-white" />
        </div>
        <span className="font-black text-xl text-violet-700">Kids Xtra</span>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-bold transition-all",
                active
                  ? "bg-violet-600 text-white shadow-[0_3px_0_#5b21b6]"
                  : "text-slate-500 hover:bg-violet-50 hover:text-violet-700"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t-4 border-slate-100">
        <Link
          href="/kid/select"
          className="flex items-center justify-center gap-2 w-full px-3 py-3 rounded-2xl text-sm font-black bg-amber-400 hover:bg-amber-500 text-slate-900 shadow-[0_4px_0_#d97706] hover:shadow-[0_2px_0_#d97706] hover:translate-y-[2px] transition-all"
        >
          <span className="text-base">🎮</span>
          Switch to Kid Mode
        </Link>
      </div>
    </aside>
  )
}
