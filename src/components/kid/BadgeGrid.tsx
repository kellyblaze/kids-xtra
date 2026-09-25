import { BADGE_DEFINITIONS } from "@/lib/badges"

interface EarnedBadge {
  badge_key: string
  earned_at: string
}

interface BadgeGridProps {
  earnedBadges: EarnedBadge[]
}

export function BadgeGrid({ earnedBadges }: BadgeGridProps) {
  const earnedSet = new Set(earnedBadges.map((b) => b.badge_key))
  const earnedMap = new Map(earnedBadges.map((b) => [b.badge_key, b.earned_at]))

  return (
    <div className="rounded-3xl border-4 border-purple-200 bg-purple-50 p-5 shadow-[0_4px_0_#e9d5ff]">
      <h3 className="font-black text-slate-700 text-lg mb-3">🏆 My badges</h3>
      <div className="grid grid-cols-3 gap-3">
        {BADGE_DEFINITIONS.map((badge) => {
          const earned = earnedSet.has(badge.key)
          const earnedAt = earnedMap.get(badge.key)
          return (
            <div
              key={badge.key}
              title={
                earned
                  ? `${badge.description}${earnedAt ? ` — earned ${new Date(earnedAt).toLocaleDateString()}` : ""}`
                  : badge.description
              }
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all ${
                earned
                  ? "border-purple-300 bg-white shadow-sm"
                  : "border-slate-200 bg-slate-50 opacity-40 grayscale"
              }`}
            >
              <span className="text-2xl">{badge.emoji}</span>
              <span
                className={`text-xs font-black text-center leading-tight ${
                  earned ? "text-slate-700" : "text-slate-400"
                }`}
              >
                {badge.title}
              </span>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-purple-600 font-bold mt-3 text-center">
        {earnedBadges.length} / {BADGE_DEFINITIONS.length} badges earned
      </p>
    </div>
  )
}
