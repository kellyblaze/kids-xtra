import type { LeaderboardEntry } from "@/lib/leaderboard"

const RANK_MEDALS = ["🥇", "🥈", "🥉"]

interface SiblingLeaderboardProps {
  entries: LeaderboardEntry[]
  currentChildId: string
}

export function SiblingLeaderboard({ entries, currentChildId }: SiblingLeaderboardProps) {
  if (entries.length < 2) return null

  return (
    <div className="rounded-3xl border-4 border-amber-200 bg-amber-50 p-5 shadow-[0_4px_0_#fde68a]">
      <h3 className="font-black text-slate-700 text-lg mb-3">🏆 This week&apos;s leaderboard</h3>
      <div className="space-y-2">
        {entries.map((entry) => {
          const isMe = entry.childId === currentChildId
          return (
            <div
              key={entry.childId}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors ${
                isMe ? "bg-amber-200 border-2 border-amber-400" : "bg-white border-2 border-amber-100"
              }`}
            >
              <span className="text-xl w-7 shrink-0 text-center">
                {RANK_MEDALS[entry.rank - 1] ?? `#${entry.rank}`}
              </span>
              <span className="text-xl shrink-0">{entry.avatarEmoji}</span>
              <span className={`flex-1 font-bold text-sm ${isMe ? "text-amber-900" : "text-slate-700"}`}>
                {entry.name}
                {isMe && <span className="ml-1 text-xs font-black text-amber-700">(you)</span>}
              </span>
              <span className="font-black text-amber-700 text-sm shrink-0">{entry.weeklyCredits} ⭐</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
