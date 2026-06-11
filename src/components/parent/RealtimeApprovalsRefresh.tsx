"use client"

import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh"

export function RealtimeApprovalsRefresh({ familyId }: { familyId: string }) {
  useRealtimeRefresh({ table: "chore_completions", filter: `family_id=eq.${familyId}` })
  useRealtimeRefresh({ table: "reward_redemptions", filter: `family_id=eq.${familyId}` })
  return null
}
