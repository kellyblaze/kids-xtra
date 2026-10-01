export type OnboardingPreferences = {
  choreReminders: boolean;
  weeklyReport: boolean;
  photoProof: boolean;
};

export type OnboardingState = {
  step: number;
  completed: boolean;
  preferences: OnboardingPreferences;
  updatedAt?: string;
  completedAt?: string;
};

export const DEFAULT_ONBOARDING_PREFERENCES: OnboardingPreferences = {
  choreReminders: true,
  weeklyReport: true,
  photoProof: false,
};

export const STARTER_REWARDS = [
  {
    id: "movie",
    emoji: "🎬",
    title: "Family movie night",
    description: "Pick the movie for family movie night",
    creditCost: 50,
    category: "experience",
  },
  {
    id: "screen",
    emoji: "🎮",
    title: "30 minutes of screen time",
    description: "Enjoy an extra 30 minutes of screen time",
    creditCost: 30,
    category: "privilege",
  },
  {
    id: "dessert",
    emoji: "🍨",
    title: "Choose dessert",
    description: "Choose a special family dessert",
    creditCost: 40,
    category: "treat",
  },
  {
    id: "outing",
    emoji: "🚲",
    title: "Choose a family outing",
    description: "Help choose our next family adventure",
    creditCost: 100,
    category: "experience",
  },
] as const;

export function parseOnboardingState(settings: unknown): OnboardingState {
  const root = isRecord(settings) ? settings : {};
  const onboarding = isRecord(root.onboarding) ? root.onboarding : {};
  const preferences = isRecord(onboarding.preferences)
    ? onboarding.preferences
    : {};
  const rawStep =
    typeof onboarding.step === "number" && Number.isInteger(onboarding.step)
      ? onboarding.step
      : 0;
  return {
    step: Math.min(Math.max(rawStep, 0), 7),
    completed: onboarding.completed === true,
    preferences: {
      choreReminders: preferences.choreReminders !== false,
      weeklyReport: preferences.weeklyReport !== false,
      photoProof: preferences.photoProof === true,
    },
    ...(typeof onboarding.updatedAt === "string"
      ? { updatedAt: onboarding.updatedAt }
      : {}),
    ...(typeof onboarding.completedAt === "string"
      ? { completedAt: onboarding.completedAt }
      : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
