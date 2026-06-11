"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { updateChore, updateChoreAssignments } from "@/app/actions/chore-actions"
import { CATEGORY_LABELS, CATEGORY_EMOJI, FREQUENCY_LABELS, DAYS_OF_WEEK } from "@/lib/constants"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface Child { id: string; name: string }
interface ChoreData {
  id: string
  title: string
  description: string | null
  category: string
  frequency: string
  custom_days: number[] | null
  times_per_period: number
  period_unit: string
  due_time: string | null
  credit_value: number
  xp_value: number
}

export default function EditChorePage() {
  const router = useRouter()
  const params = useParams()
  const choreId = params.choreId as string

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildren, setSelectedChildren] = useState<string[]>([])
  const [chore, setChore] = useState<ChoreData | null>(null)

  const [frequency, setFrequency] = useState("daily")
  const [category, setCategory] = useState("chore")
  const [customDays, setCustomDays] = useState<number[]>([])
  const [timesPeriod, setTimesPeriod] = useState(1)
  const [periodUnit, setPeriodUnit] = useState("day")

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase
        .from("chores")
        .select("id, title, description, category, frequency, custom_days, times_per_period, period_unit, due_time, credit_value, xp_value")
        .eq("id", choreId)
        .single(),
      supabase
        .from("child_profiles")
        .select("id, name")
        .eq("is_active", true),
      supabase
        .from("chore_assignments")
        .select("child_id")
        .eq("chore_id", choreId)
        .eq("is_active", true),
    ]).then(([{ data: choreData }, { data: childData }, { data: assignData }]) => {
      if (choreData) {
        setChore(choreData)
        setCategory(choreData.category)
        setFrequency(choreData.frequency)
        setCustomDays(choreData.custom_days ?? [])
        setTimesPeriod(choreData.times_per_period ?? 1)
        setPeriodUnit(choreData.period_unit ?? "day")
      }
      setChildren(childData ?? [])
      setSelectedChildren((assignData ?? []).map((a) => a.child_id))
      setLoading(false)
    })
  }, [choreId])

  function toggleChild(id: string) {
    setSelectedChildren((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  function toggleDay(day: number) {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  function handleSubmit(formData: FormData) {
    formData.set("category", category)
    formData.set("frequency", frequency)
    if (frequency === "custom") formData.set("custom_days", customDays.join(","))
    formData.set("times_per_period", String(timesPeriod))
    formData.set("period_unit", periodUnit)
    formData.set("is_active", "true")
    setError(null)
    startTransition(async () => {
      const [result] = await Promise.all([
        updateChore(choreId, formData),
        updateChoreAssignments(choreId, selectedChildren),
      ])
      if (result?.error) setError(result.error)
      else router.push("/parent/chores")
    })
  }

  if (loading) return <div className="text-sm text-muted-foreground p-4">Loading…</div>
  if (!chore) return <div className="text-sm text-destructive p-4">Chore not found.</div>

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/parent/chores"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Edit chore</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" defaultValue={chore.title} required autoFocus />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" name="description" defaultValue={chore.description ?? ""} rows={2} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {CATEGORY_EMOJI[key as keyof typeof CATEGORY_EMOJI]} {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={(v) => v && setFrequency(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>How many times?</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={timesPeriod}
                  onChange={(e) => setTimesPeriod(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">time{timesPeriod !== 1 ? "s" : ""} per</span>
                <Select value={periodUnit} onValueChange={(v) => v && setPeriodUnit(v)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {timesPeriod > 1 && (
                <p className="text-xs text-muted-foreground">
                  Kids can complete this {timesPeriod}× per {periodUnit}
                </p>
              )}
            </div>

            {frequency === "custom" && (
              <div className="space-y-2">
                <Label>Days of the week</Label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS_OF_WEEK.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleDay(value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        customDays.includes(value)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:bg-muted"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="credit_value">Credits *</Label>
                <Input id="credit_value" name="credit_value" type="number" min="1" max="1000" defaultValue={chore.credit_value} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="due_time">Due time (optional)</Label>
                <Input id="due_time" name="due_time" type="time" defaultValue={chore.due_time ?? ""} />
              </div>
            </div>

            {children.length > 0 && (
              <div className="space-y-2">
                <Label>Assign to children</Label>
                <div className="flex gap-2 flex-wrap">
                  {children.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => toggleChild(child.id)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                        selectedChildren.includes(child.id)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:bg-muted"
                      }`}
                    >
                      {child.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? "Saving…" : "Save changes"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/parent/chores")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
