"use server"

import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"

export interface ChoreSuggestion {
  title: string
  description: string
  category: string
  credit_value: number
  frequency: string
}

export async function suggestChores(childAge?: number): Promise<{ suggestions?: ChoreSuggestion[]; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { error: "AI suggestions are not configured" }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()
  if (!profile) return { error: "Profile not found" }

  const { data: existingChores } = await supabase
    .from("chores")
    .select("title, category")
    .eq("family_id", profile.family_id)
    .eq("is_active", true)

  const existingTitles = existingChores?.map((c) => c.title).join(", ") || "none"
  const ageContext = childAge ? `aged around ${childAge}` : "ages 6–10"

  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a helpful assistant for a family chore app. Suggest 5 age-appropriate chores for children ${ageContext}.

Existing chores (do not repeat these): ${existingTitles}

Categories available: chore, morning_routine, bedtime_routine, kindness, learning, health_hygiene, bonus_mission
Frequencies available: one_time, daily, weekly, custom

Return ONLY a valid JSON array with exactly 5 objects. Each object must have:
- title: string (short, action-oriented, e.g. "Make your bed")
- description: string (1 sentence of extra instructions for the child)
- category: string (one of the categories above)
- credit_value: number (5–30, based on difficulty)
- frequency: string (one of the frequencies above)

Do not include any text outside the JSON array.`,
      },
    ],
  })

  const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : ""

  try {
    const parsed = JSON.parse(raw) as ChoreSuggestion[]
    if (!Array.isArray(parsed)) throw new Error("Not an array")
    return { suggestions: parsed.slice(0, 5) }
  } catch {
    return { error: "AI returned an unexpected response. Please try again." }
  }
}
