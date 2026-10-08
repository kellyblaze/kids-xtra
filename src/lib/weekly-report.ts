export interface WeeklyChildInput {
  childId: string
  childName: string
  level: number
  xpTotal: number
  currentStreak: number
  activities: {
    event_type: string
    metadata: Record<string, string> | null
  }[]
  transactions: {
    amount: number
  }[]
}

export interface WeeklyChildSummary {
  childId: string
  childName: string
  missionsCompleted: number
  creditsEarned: number
  creditsSpent: number
  creditsSaved: number
  rewardsRedeemed: number
  currentStreak: number
  level: number
  levelProgress: number
  biggestWin: string
  nextStep: string
}

export function summarizeWeeklyChild(input: WeeklyChildInput): WeeklyChildSummary {
  const missionsCompleted = input.activities.filter((activity) => activity.event_type === "chore_approved").length
  const rewardsRedeemed = input.activities.filter((activity) => activity.event_type === "reward_approved").length
  const creditsEarned = input.transactions
    .filter((transaction) => transaction.amount > 0)
    .reduce((sum, transaction) => sum + transaction.amount, 0)
  const creditsSpent = Math.abs(
    input.transactions
      .filter((transaction) => transaction.amount < 0)
      .reduce((sum, transaction) => sum + transaction.amount, 0),
  )
  const levelProgress = calculateLevelProgress(input.xpTotal, input.level)

  return {
    childId: input.childId,
    childName: input.childName,
    missionsCompleted,
    creditsEarned,
    creditsSpent,
    creditsSaved: Math.max(0, creditsEarned - creditsSpent),
    rewardsRedeemed,
    currentStreak: input.currentStreak,
    level: input.level,
    levelProgress,
    biggestWin: buildBiggestWin(input.childName, missionsCompleted, input.currentStreak),
    nextStep: buildNextStep(missionsCompleted, input.currentStreak, rewardsRedeemed),
  }
}

export function calculateLevelProgress(xpTotal: number, level: number): number {
  const safeLevel = Math.max(1, level)
  const currentLevelXp = Math.pow(safeLevel - 1, 2) * 50
  const nextLevelXp = Math.pow(safeLevel, 2) * 50
  if (nextLevelXp <= currentLevelXp) return 100
  return Math.max(0, Math.min(100, Math.round(((xpTotal - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100)))
}

function buildBiggestWin(childName: string, missionsCompleted: number, currentStreak: number): string {
  if (currentStreak >= 7) return `${childName} kept a ${currentStreak}-day routine streak.`
  if (missionsCompleted >= 5) return `${childName} completed ${missionsCompleted} Missions this week.`
  if (missionsCompleted > 0) return `${childName} completed ${missionsCompleted} Mission${missionsCompleted === 1 ? "" : "s"}.`
  return `${childName} is ready for a fresh Mission this week.`
}

function buildNextStep(missionsCompleted: number, currentStreak: number, rewardsRedeemed: number): string {
  if (missionsCompleted === 0) return "Start with one small Mission that can be completed today."
  if (currentStreak < 3) return "Try repeating one simple routine Mission for three days."
  if (rewardsRedeemed === 0) return "Review the Reward Store together and choose a savings goal."
  return "Add one slightly more independent Mission for next week."
}
