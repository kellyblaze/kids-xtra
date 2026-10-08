"use server"

import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import { consumeRateLimit } from "@/lib/rate-limit"

export interface ChoreSuggestion {
  title: string
  description: string
  category: string
  credit_value: number
  xp_value: number
  frequency: string
}

export interface XtraCoachInput {
  childAge?: number
  goal: string
  currentChallenge?: string
  daysAvailable?: string
  difficulty?: string
  timeAvailable?: string
}

export interface XtraCoachMission extends ChoreSuggestion {
  week: number
  times_per_period: number
  period_unit: "day" | "week" | "month"
  requires_photo: boolean
}

export interface XtraCoachWeek {
  week: number
  focus: string
  missions: string[]
}

export interface XtraCoachPlan {
  plan_title: string
  goal: string
  age_range: string
  weeks: XtraCoachWeek[]
  missions: XtraCoachMission[]
  credit_recommendation: string
  xp_recommendation: string
  parent_tip: string
}

const VALID_CATEGORIES = new Set([
  "chore",
  "morning_routine",
  "bedtime_routine",
  "kindness",
  "learning",
  "health_hygiene",
  "bonus_mission",
])

const VALID_FREQUENCIES = new Set(["one_time", "daily", "weekly", "custom"])

export async function suggestChores(childAge?: number): Promise<{ suggestions?: ChoreSuggestion[]; error?: string }> {
  const result = await generateXtraCoachPlan({
    childAge,
    goal: "Personal Responsibility",
    currentChallenge: "Suggest a small set of age-appropriate starter missions.",
  })
  if (result.error) return { error: result.error }
  return { suggestions: result.plan?.missions.slice(0, 5) }
}

export async function generateXtraCoachPlan(
  input: XtraCoachInput,
): Promise<{ plan?: XtraCoachPlan; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { error: "Xtra Coach is not configured" }

  const age = input.childAge
  if (age !== undefined && (!Number.isInteger(age) || age < 6 || age > 10)) {
    return { error: "Xtra Coach plans are currently designed for ages 6–10." }
  }

  const goal = cleanText(input.goal, 80)
  if (!goal) return { error: "Choose a goal for the plan." }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()
  if (!profile) return { error: "Profile not found" }

  const aiLimit = await consumeRateLimit({
    action: "xtra-coach-plan",
    subject: user.id,
    maxAttempts: 10,
    windowSeconds: 60 * 60,
    blockSeconds: 60 * 60,
  })
  if (!aiLimit.allowed) return { error: "Too many AI requests. Please wait before trying again." }

  const { data: existingChores } = await supabase
    .from("chores")
    .select("title, category")
    .eq("family_id", profile.family_id)
    .eq("is_active", true)

  const existingTitles = existingChores?.map((c) => c.title).join(", ") || "none"
  const ageContext = age ? `age ${age}` : "ages 6–10"
  const currentChallenge = cleanText(input.currentChallenge, 240) || "Not provided"
  const daysAvailable = cleanText(input.daysAvailable, 80) || "Flexible"
  const difficulty = cleanText(input.difficulty, 60) || "Easy"
  const timeAvailable = cleanText(input.timeAvailable, 80) || "5-15 minutes per mission"

  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1600,
    messages: [
      {
        role: "user",
        content: `You are Xtra Coach for KidsXtra, a responsibility and earning system for kids ages 6-10.

Create a simple development-oriented Mission Plan for a child ${ageContext}.

Parent goal: ${goal}
Current challenge: ${currentChallenge}
Days available: ${daysAvailable}
Difficulty: ${difficulty}
Time available: ${timeAvailable}

Existing Missions (do not repeat these): ${existingTitles}

Categories available: chore, morning_routine, bedtime_routine, kindness, learning, health_hygiene, bonus_mission
Frequencies available: one_time, daily, weekly, custom

Return ONLY valid JSON with this exact shape:
{
  "plan_title": "string",
  "goal": "string",
  "age_range": "string",
  "weeks": [
    { "week": 1, "focus": "string", "missions": ["Mission title"] }
  ],
  "missions": [
    {
      "week": 1,
      "title": "short action title",
      "description": "one child-friendly sentence",
      "category": "one valid category",
      "credit_value": 5,
      "xp_value": 10,
      "frequency": "one valid frequency",
      "times_per_period": 1,
      "period_unit": "day",
      "requires_photo": false
    }
  ],
  "credit_recommendation": "string",
  "xp_recommendation": "string",
  "parent_tip": "string"
}

Rules:
- Include 2-3 weeks and 4-7 missions total.
- Keep language understandable for ages 6-10.
- Credits should be 5-30. XP should be 5-40.
- Do not create banking, cash-out, or real-money language.
- Parents must review before adding, so do not imply missions are automatically assigned.
- Do not include any text outside the JSON object.`,
      },
    ],
  })

  const rawText = message.content[0]?.type === "text" ? message.content[0].text.trim() : ""
  const raw = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()

  try {
    const parsed = JSON.parse(raw) as unknown
    const plan = validatePlan(parsed, goal)
    await supabase.from("activity_logs").insert({
      family_id: profile.family_id,
      actor_type: "parent",
      actor_id: user.id,
      event_type: "xtra_coach_plan_generated",
      metadata: {
        goal: plan.goal,
        plan_title: plan.plan_title,
        missions: String(plan.missions.length),
      },
    })
    return { plan }
  } catch {
    return { error: "AI returned an unexpected response. Please try again." }
  }
}

function validatePlan(value: unknown, fallbackGoal: string): XtraCoachPlan {
  if (!isRecord(value)) throw new Error("Plan must be an object")

  const missionsRaw = Array.isArray(value.missions) ? value.missions : []
  if (missionsRaw.length < 1) throw new Error("Plan must include missions")

  const missions = missionsRaw.slice(0, 7).map(validateMission)
  const missionTitles = new Set(missions.map((mission) => mission.title))

  const weeksRaw = Array.isArray(value.weeks) ? value.weeks : []
  const weeks = weeksRaw.slice(0, 3).map((week, index) => validateWeek(week, index + 1, missionTitles))

  if (!weeks.length) {
    weeks.push({
      week: 1,
      focus: "Start with simple responsibility missions",
      missions: missions.slice(0, 3).map((mission) => mission.title),
    })
  }

  return {
    plan_title: cleanText(value.plan_title, 80) || "Xtra Coach Mission Plan",
    goal: cleanText(value.goal, 80) || fallbackGoal,
    age_range: cleanText(value.age_range, 40) || "Ages 6-10",
    weeks,
    missions,
    credit_recommendation:
      cleanText(value.credit_recommendation, 180) ||
      "Use smaller Credit rewards for daily habits and higher Credits for harder weekly missions.",
    xp_recommendation:
      cleanText(value.xp_recommendation, 180) ||
      "Use XP to show growth and consistency, separate from Credits.",
    parent_tip:
      cleanText(value.parent_tip, 220) ||
      "Review the plan, adjust rewards, and start with the missions your child can understand today.",
  }
}

function validateMission(value: unknown): XtraCoachMission {
  if (!isRecord(value)) throw new Error("Mission must be an object")

  const title = cleanText(value.title, 60)
  const description = cleanText(value.description, 180)
  const category = cleanText(value.category, 40)
  const frequency = cleanText(value.frequency, 40)
  const periodUnit = cleanText(value.period_unit, 20)

  if (!title || !description) throw new Error("Mission needs title and description")
  if (!VALID_CATEGORIES.has(category)) throw new Error("Invalid mission category")
  if (!VALID_FREQUENCIES.has(frequency)) throw new Error("Invalid mission frequency")

  return {
    week: clampInteger(value.week, 1, 1, 3),
    title,
    description,
    category,
    credit_value: clampInteger(value.credit_value, 10, 5, 30),
    xp_value: clampInteger(value.xp_value, 10, 5, 40),
    frequency,
    times_per_period: clampInteger(value.times_per_period, 1, 1, 7),
    period_unit: periodUnit === "week" || periodUnit === "month" ? periodUnit : "day",
    requires_photo: value.requires_photo === true,
  }
}

function validateWeek(value: unknown, fallbackWeek: number, missionTitles: Set<string>): XtraCoachWeek {
  if (!isRecord(value)) throw new Error("Week must be an object")
  const rawMissions = Array.isArray(value.missions) ? value.missions : []
  const missions = rawMissions
    .map((mission) => cleanText(mission, 60))
    .filter((mission) => missionTitles.has(mission))

  return {
    week: clampInteger(value.week, fallbackWeek, 1, 3),
    focus: cleanText(value.focus, 120) || `Week ${fallbackWeek}`,
    missions,
  }
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
