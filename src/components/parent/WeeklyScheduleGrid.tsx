import { CATEGORY_EMOJI } from "@/lib/constants"
import type { DaySchedule, ChoreScheduleItem } from "@/lib/schedule"

interface Props {
  days: DaySchedule[]
  periodicChores: ChoreScheduleItem[]
}

export function WeeklyScheduleGrid({ days, periodicChores }: Props) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-950">Weekly Schedule</h2>
          <p className="text-sm font-medium text-slate-500">A quick scan of what is planned.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((day) => (
          <div key={day.label} className="min-h-[112px] rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-700">{day.label.split(",")[0]}</p>
            <p className="mb-3 text-xs font-bold text-slate-400">{day.label.split(", ")[1]}</p>
            {day.chores.length === 0 ? (
              <p className="text-xs font-medium text-slate-400">No Missions</p>
            ) : (
              <div className="space-y-1.5">
                {day.chores.map((c) => (
                  <div key={c.choreId} className="flex items-center gap-1.5 rounded-xl bg-white px-2 py-1.5 shadow-sm" title={`${c.choreTitle} (${c.childNames.join(", ")})`}>
                    <span className="text-xs">{CATEGORY_EMOJI[c.category as keyof typeof CATEGORY_EMOJI] ?? "📋"}</span>
                    <span className="truncate text-xs font-bold text-slate-700">{c.choreTitle}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {periodicChores.length > 0 && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-sm font-black text-slate-950">Weekly and monthly Missions</p>
          <div className="space-y-2">
            {periodicChores.map((c) => (
              <div key={c.choreId} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
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
