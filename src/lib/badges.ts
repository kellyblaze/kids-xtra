export interface BadgeDefinition {
  key: string
  emoji: string
  title: string
  description: string
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { key: "first_chore", emoji: "⭐", title: "First Steps", description: "Completed your very first chore!" },
  { key: "chores_10", emoji: "🔟", title: "Double Digits", description: "Completed 10 chores total" },
  { key: "chores_50", emoji: "🏅", title: "Chore Champion", description: "Completed 50 chores total" },
  { key: "chores_100", emoji: "💯", title: "Century Club", description: "Completed 100 chores total" },
  { key: "streak_3", emoji: "🔥", title: "On Fire", description: "Completed chores 3 days in a row" },
  { key: "streak_7", emoji: "🌟", title: "Week Warrior", description: "Completed chores 7 days in a row" },
  { key: "credits_100", emoji: "💰", title: "Saver", description: "Earned 100 credits total" },
  { key: "credits_500", emoji: "🏦", title: "Big Saver", description: "Earned 500 credits total" },
  { key: "first_reward", emoji: "🎁", title: "Treat Yourself", description: "Redeemed your first reward" },
]

const BADGE_MAP = new Map(BADGE_DEFINITIONS.map((b) => [b.key, b]))

export function getBadgeDefinition(key: string): BadgeDefinition | undefined {
  return BADGE_MAP.get(key)
}

export interface ChildStats {
  totalChores: number
  totalCreditsEarned: number
  currentStreak: number
  hasRedeemedReward: boolean
}

export function evaluateBadges(stats: ChildStats, earnedKeys: Set<string>): string[] {
  const toAward: string[] = []

  const check = (key: string, condition: boolean) => {
    if (condition && !earnedKeys.has(key)) toAward.push(key)
  }

  check("first_chore", stats.totalChores >= 1)
  check("chores_10", stats.totalChores >= 10)
  check("chores_50", stats.totalChores >= 50)
  check("chores_100", stats.totalChores >= 100)
  check("streak_3", stats.currentStreak >= 3)
  check("streak_7", stats.currentStreak >= 7)
  check("credits_100", stats.totalCreditsEarned >= 100)
  check("credits_500", stats.totalCreditsEarned >= 500)
  check("first_reward", stats.hasRedeemedReward)

  return toAward
}
