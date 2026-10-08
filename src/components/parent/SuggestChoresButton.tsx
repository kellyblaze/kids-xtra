"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  generateXtraCoachPlan,
  type XtraCoachInput,
  type XtraCoachMission,
  type XtraCoachPlan,
} from "@/app/actions/ai-actions"
import { createChore } from "@/app/actions/chore-actions"
import { CATEGORY_EMOJI, FREQUENCY_LABELS } from "@/lib/constants"
import { updateXtraCoachDraftMission } from "@/lib/mission-product"
import { Sparkles, Plus, Loader2, RefreshCw, WandSparkles, SlidersHorizontal } from "lucide-react"

const GOALS = [
  "Morning Independence",
  "Cleaning Habits",
  "Homework Routine",
  "Helping the Family",
  "Bedtime Routine",
  "Organization",
  "Personal Responsibility",
  "Saving Toward a Goal",
  "Custom",
]

export function SuggestChoresButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [plan, setPlan] = useState<XtraCoachPlan | null>(null)
  const [goal, setGoal] = useState(GOALS[0])
  const [customGoal, setCustomGoal] = useState("")
  const [childAge, setChildAge] = useState("8")
  const [currentChallenge, setCurrentChallenge] = useState("")
  const [daysAvailable, setDaysAvailable] = useState("Weekdays")
  const [difficulty, setDifficulty] = useState("Easy")
  const [timeAvailable, setTimeAvailable] = useState("5-10 minutes")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [customizing, setCustomizing] = useState(false)
  const [, startTransition] = useTransition()

  async function fetchPlan() {
    setLoading(true)
    setError(null)
    setPlan(null)

    const selectedGoal = goal === "Custom" ? customGoal : goal
    const input: XtraCoachInput = {
      childAge: Number.parseInt(childAge, 10),
      goal: selectedGoal,
      currentChallenge,
      daysAvailable,
      difficulty,
      timeAvailable,
    }

    const result = await generateXtraCoachPlan(input)
    if (result.error) setError(result.error)
    else setPlan(result.plan ?? null)
    setCustomizing(false)
    setLoading(false)
  }

  function handleOpen() {
    setOpen(true)
    setAdded(new Set())
    setError(null)
  }

  function handleAddMission(mission: XtraCoachMission) {
    setAdding(mission.title)
    startTransition(async () => {
      const result = await createChore(toFormData(mission))
      if (result?.error) {
        setError(result.error)
        setAdding(null)
        return
      }
      setAdded((prev) => new Set(prev).add(mission.title))
      setAdding(null)
      router.refresh()
    })
  }

  function handleAddPlan() {
    if (!plan) return
    const remaining = plan.missions.filter((mission) => !added.has(mission.title))
    setAdding("plan")
    startTransition(async () => {
      for (const mission of remaining) {
        const result = await createChore(toFormData(mission))
        if (result?.error) {
          setError(result.error)
          setAdding(null)
          return
        }
      }
      setAdded((prev) => new Set([...prev, ...remaining.map((mission) => mission.title)]))
      setAdding(null)
      router.refresh()
    })
  }

  function handleMissionPatch(index: number, patch: Partial<XtraCoachMission>) {
    setPlan((current) =>
      current ? updateXtraCoachDraftMission(current, index, patch) : current,
    )
  }

  return (
    <>
      <Button variant="outline" onClick={handleOpen}>
        <Sparkles className="w-4 h-4 mr-2 text-violet-500" />
        Ask Xtra Coach
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WandSparkles className="w-5 h-5 text-violet-500" />
              Xtra Coach Mission Plan
            </DialogTitle>
            <DialogDescription>
              Generate a structured plan, review every mission, then add only what fits your family.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="xtra-age">Child age</Label>
              <Input
                id="xtra-age"
                type="number"
                min="6"
                max="10"
                value={childAge}
                onChange={(event) => setChildAge(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="xtra-goal">Goal</Label>
              <select
                id="xtra-goal"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-violet-600"
              >
                {GOALS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            {goal === "Custom" && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="xtra-custom-goal">Custom goal</Label>
                <Input
                  id="xtra-custom-goal"
                  value={customGoal}
                  onChange={(event) => setCustomGoal(event.target.value)}
                  placeholder="Build a better after-school routine"
                />
              </div>
            )}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="xtra-challenge">Current challenge</Label>
              <Textarea
                id="xtra-challenge"
                value={currentChallenge}
                onChange={(event) => setCurrentChallenge(event.target.value)}
                rows={2}
                placeholder="Needs reminders for each step before school."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="xtra-days">Days available</Label>
              <Input
                id="xtra-days"
                value={daysAvailable}
                onChange={(event) => setDaysAvailable(event.target.value)}
                placeholder="Weekdays"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="xtra-time">Time available</Label>
              <Input
                id="xtra-time"
                value={timeAvailable}
                onChange={(event) => setTimeAvailable(event.target.value)}
                placeholder="5-10 minutes"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="xtra-difficulty">Difficulty</Label>
              <select
                id="xtra-difficulty"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-violet-600"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Stretch">Stretch</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={fetchPlan} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? "Generating..." : "Generate Plan"}
              </Button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          {plan && (
            <div className="space-y-4 border-t pt-4">
              <div>
                <h3 className="text-base font-black text-slate-900">{plan.plan_title}</h3>
                <p className="text-sm text-slate-500">{plan.parent_tip}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {plan.weeks.map((week) => (
                  <div key={week.week} className="rounded-xl border bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase text-violet-600">Week {week.week}</p>
                    <p className="text-sm font-bold text-slate-800">{week.focus}</p>
                    {week.missions.length > 0 && (
                      <p className="mt-1 text-xs text-slate-500">{week.missions.join(", ")}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {plan.missions.map((mission, index) => {
                  const isAdded = added.has(mission.title)
                  const isAdding = adding === mission.title
                  const emoji = CATEGORY_EMOJI[mission.category as keyof typeof CATEGORY_EMOJI] ?? "📋"
                  const freqLabel = FREQUENCY_LABELS[mission.frequency] ?? mission.frequency

                  return (
                    <div
                      key={mission.title}
                      className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                        isAdded ? "border-emerald-200 bg-emerald-50" : "bg-card"
                      }`}
                    >
                      <span className="mt-0.5 text-xl shrink-0">{emoji}</span>
                      <div className="min-w-0 flex-1 space-y-2">
                        {customizing && !isAdded ? (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input
                              aria-label="Mission name"
                              value={mission.title}
                              onChange={(event) =>
                                handleMissionPatch(index, { title: event.target.value })
                              }
                              className="h-9 text-sm font-bold"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                aria-label="Credits"
                                type="number"
                                min="5"
                                max="30"
                                value={mission.credit_value}
                                onChange={(event) =>
                                  handleMissionPatch(index, {
                                    credit_value: Number.parseInt(event.target.value, 10),
                                  })
                                }
                                className="h-9"
                              />
                              <Input
                                aria-label="XP"
                                type="number"
                                min="5"
                                max="40"
                                value={mission.xp_value}
                                onChange={(event) =>
                                  handleMissionPatch(index, {
                                    xp_value: Number.parseInt(event.target.value, 10),
                                  })
                                }
                                className="h-9"
                              />
                            </div>
                            <Textarea
                              aria-label="Mission description"
                              value={mission.description}
                              onChange={(event) =>
                                handleMissionPatch(index, { description: event.target.value })
                              }
                              rows={2}
                              className="sm:col-span-2 text-sm"
                            />
                            <select
                              aria-label="Mission frequency"
                              value={mission.frequency}
                              onChange={(event) =>
                                handleMissionPatch(index, {
                                  frequency: event.target.value as XtraCoachMission["frequency"],
                                  period_unit:
                                    event.target.value === "weekly" ? "week" : mission.period_unit,
                                })
                              }
                              className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-violet-600"
                            >
                              <option value="one_time">One time</option>
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                            </select>
                            <label className="flex h-9 items-center gap-2 rounded-md border px-2 text-sm font-medium">
                              <input
                                type="checkbox"
                                checked={mission.requires_photo}
                                onChange={(event) =>
                                  handleMissionPatch(index, {
                                    requires_photo: event.target.checked,
                                  })
                                }
                              />
                              Photo proof
                            </label>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-bold text-slate-800">{mission.title}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{mission.description}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge variant="secondary" className="text-xs">{mission.credit_value} Credits</Badge>
                              <Badge variant="secondary" className="text-xs">{mission.xp_value} XP</Badge>
                              <Badge variant="outline" className="text-xs">Week {mission.week}</Badge>
                              <Badge variant="outline" className="text-xs">{freqLabel}</Badge>
                              {mission.requires_photo && <Badge variant="outline" className="text-xs">Photo</Badge>}
                            </div>
                          </>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={isAdded ? "default" : "outline"}
                        disabled={isAdded || isAdding || adding === "plan"}
                        onClick={() => handleAddMission(mission)}
                        className={`shrink-0 ${isAdded ? "bg-emerald-500 hover:bg-emerald-500 text-white" : ""}`}
                      >
                        {isAdding
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : isAdded
                            ? "Added"
                            : <><Plus className="w-4 h-4 mr-1" />Add</>}
                      </Button>
                    </div>
                  )
                })}
              </div>

              <div className="rounded-xl border border-violet-100 bg-violet-50 p-3 text-xs text-violet-900">
                <p><span className="font-black">Credits:</span> {plan.credit_recommendation}</p>
                <p className="mt-1"><span className="font-black">XP:</span> {plan.xp_recommendation}</p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={handleAddPlan} disabled={adding === "plan" || plan.missions.every((mission) => added.has(mission.title))}>
                  {adding === "plan" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Entire Plan
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCustomizing((value) => !value)}
                  disabled={adding === "plan"}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  {customizing ? "Review Plan" : "Customize First"}
                </Button>
                <Button variant="ghost" onClick={fetchPlan} disabled={loading || adding === "plan"}>
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function toFormData(mission: XtraCoachMission): FormData {
  const formData = new FormData()
  formData.set("title", mission.title)
  formData.set("description", mission.description)
  formData.set("category", mission.category)
  formData.set("frequency", mission.frequency)
  formData.set("credit_value", String(mission.credit_value))
  formData.set("xp_value", String(mission.xp_value))
  formData.set("times_per_period", String(mission.times_per_period))
  formData.set("period_unit", mission.period_unit)
  formData.set("requires_photo", String(mission.requires_photo))
  formData.set("source", "xtra_coach")
  return formData
}
