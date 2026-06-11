"use client"

import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh"

export function RealtimeKidRefresh({ childId }: { childId: string }) {
  useRealtimeRefresh({ table: "chore_completions", filter: `child_id=eq.${childId}` })
  return null
}
