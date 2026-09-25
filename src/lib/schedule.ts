export interface ChoreScheduleItem {
  choreId: string
  choreTitle: string
  creditValue: number
  category: string
  childNames: string[]
  timesPerPeriod: number
  periodUnit: string
}

export interface DaySchedule {
  date: Date
  label: string
  chores: ChoreScheduleItem[]
}

interface RawChore {
  id: string
  title: string
  credit_value: number
  category: string
  period_unit: string
  times_per_period: number
  chore_assignments: Array<{
    child_profiles: { name: string } | Array<{ name: string }> | null
  }> | null
}

export function buildWeekSchedule(chores: RawChore[], weekStart: Date): DaySchedule[] {
  const days: DaySchedule[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    const label = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    const daily = chores.filter((c) => c.period_unit === "day").map(choreToItem)
    days.push({ date, label, chores: daily })
  }
  return days
}

export function buildPeriodicChores(chores: RawChore[]): ChoreScheduleItem[] {
  return chores.filter((c) => c.period_unit !== "day").map(choreToItem)
}

function choreToItem(c: RawChore): ChoreScheduleItem {
  const assignments = Array.isArray(c.chore_assignments) ? c.chore_assignments : []
  const childNames = assignments.map((a) => {
    const p = Array.isArray(a.child_profiles) ? a.child_profiles[0] : a.child_profiles
    return p?.name ?? "Unknown"
  })
  return {
    choreId: c.id,
    choreTitle: c.title,
    creditValue: c.credit_value,
    category: c.category,
    childNames,
    timesPerPeriod: c.times_per_period,
    periodUnit: c.period_unit,
  }
}
