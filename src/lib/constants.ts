import type { TaskCategory } from "@/types/database"

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  chore: "Chore",
  morning_routine: "Morning Routine",
  bedtime_routine: "Bedtime Routine",
  kindness: "Kindness",
  learning: "Learning",
  health_hygiene: "Health & Hygiene",
  bonus_mission: "Bonus Mission",
}

export const CATEGORY_EMOJI: Record<TaskCategory, string> = {
  chore: "🧹",
  morning_routine: "🌅",
  bedtime_routine: "🌙",
  kindness: "💛",
  learning: "📚",
  health_hygiene: "🪥",
  bonus_mission: "⭐",
}

export const FREQUENCY_LABELS: Record<string, string> = {
  one_time: "One time",
  daily: "Every day",
  weekly: "Every week",
  custom: "Custom days",
}

export const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
]

export const AVATAR_EMOJI: Record<string, string> = {
  star: "⭐",
  rocket: "🚀",
  sun: "☀️",
  rainbow: "🌈",
  heart: "💖",
  lion: "🦁",
  unicorn: "🦄",
  turtle: "🐢",
  owl: "🦉",
  panda: "🐼",
  dragon: "🐉",
  butterfly: "🦋",
}

export const AVATAR_OPTIONS = Object.entries(AVATAR_EMOJI).map(([key, emoji]) => ({ key, emoji }))

export const COLOR_THEMES = [
  { value: "purple", label: "Purple", bg: "bg-violet-100", text: "text-violet-700" },
  { value: "blue", label: "Blue", bg: "bg-blue-100", text: "text-blue-700" },
  { value: "green", label: "Green", bg: "bg-emerald-100", text: "text-emerald-700" },
  { value: "orange", label: "Orange", bg: "bg-orange-100", text: "text-orange-700" },
  { value: "pink", label: "Pink", bg: "bg-pink-100", text: "text-pink-700" },
  { value: "yellow", label: "Yellow", bg: "bg-yellow-100", text: "text-yellow-700" },
]

export const REWARD_CATEGORIES = [
  "Screen time",
  "Treat",
  "Activity",
  "Experience",
  "Toy / item",
  "Privilege",
  "Other",
]
