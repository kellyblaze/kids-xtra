"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { signOut } from "@/app/actions/auth"
import { LogOut, Settings, Star } from "lucide-react"
import Link from "next/link"

interface ParentTopbarProps {
  profile: {
    display_name: string | null
    families: { name: string } | null
  }
}

export function ParentTopbar({ profile }: ParentTopbarProps) {
  const name = profile.display_name ?? "Parent"
  const familyName = profile.families?.name ?? "My Family"
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-4 md:px-6 shrink-0">
      <div>
        <p className="text-sm font-semibold text-foreground">{familyName}</p>
        <p className="text-xs text-muted-foreground hidden md:block">Parent dashboard</p>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="hidden sm:flex">
          <Link href="/kid/select">
            <Star className="w-3.5 h-3.5 mr-1.5 fill-primary text-primary" />
            Kid Mode
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <p className="font-medium">{name}</p>
              <p className="text-xs text-muted-foreground font-normal">{familyName}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link href="/parent/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center gap-2 text-destructive cursor-pointer"
              onClick={() => signOut()}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
