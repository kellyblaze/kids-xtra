import { CATEGORY_EMOJI } from "@/lib/constants"
import type { DaySchedule, ChoreScheduleItem } from "@/lib/schedule"

interface Props {
  days: DaySchedule[]
  periodicChores: ChoreScheduleItem[]
}

export function WeeklyScheduleGrid({ days, periodicChores }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="font-black text-slate-700 text-sm uppercase tracking-wide">Weekly Schedule</h2>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => (
          <div key={day.label} className="rounded-2xl border-2 border-slate-200 bg-white p-2 min-h-[80px]">
            <p className="text-xs font-black text-slate-500 mb-1">{day.label.split(",")[0]}</p>
            <p className="text-xs text-slate-400 mb-2">{day.label.split(", ")[1]}</p>
            {day.chores.length === 0 ? (
              <p className="text-xs text-slate-300 italic">—</p>
            ) : (
              <div className="space-y-1">
                {day.chores.map((c) => (
                  <div key={c.choreId} className="flex items-center gap-1" title={`${c.choreTitle} (${c.childNames.join(", ")})`}>
                    <span className="text-xs">{CATEGORY_EMOJI[c.category as keyof typeof CATEGORY_EMOJI] ?? "📋"}</span>
                    <span className="text-xs font-medium text-slate-600 truncate">{c.choreTitle}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {periodicChores.length > 0 && (
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-4">
          <p className="text-xs font-black text-slate-500 uppercase tracking-wide mb-3">Weekly / Monthly</p>
          <div className="space-y-2">
            {periodicChores.map((c) => (
              <div key={c.choreId} className="flex items-center gap-2">
                <span>{CATEGORY_EMOJI[c.category as keyof typeof CATEGORY_EMOJI] ?? "📋"}</span>
                <span className="font-bold text-sm text-slate-700">{c.choreTitle}</span>
                <span className="text-xs text-slate-400 ml-auto">
                  {c.timesPerPeriod}× / {c.periodUnit}
                  {c.childNames.length > 0 && ` · ${c.childNames.join(", ")}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
