"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { createChore } from "@/app/actions/chore-actions"
import { CATEGORY_LABELS, CATEGORY_EMOJI, FREQUENCY_LABELS, DAYS_OF_WEEK } from "@/lib/constants"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface Child { id: string; name: string }

export default function NewChorePage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildren, setSelectedChildren] = useState<string[]>([])
  const [frequency, setFrequency] = useState<string | null>("daily")
  const [category, setCategory] = useState<string | null>("chore")
  const [customDays, setCustomDays] = useState<number[]>([])
  const [timesPeriod, setTimesPeriod] = useState(1)
  const [periodUnit, setPeriodUnit] = useState("day")
  const [requiresPhoto, setRequiresPhoto] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("child_profiles")
      .select("id, name")
      .eq("is_active", true)
      .then(({ data }) => setChildren(data ?? []))
  }, [])

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
    if (!category || !frequency) {
      setError("Please choose a category and frequency.")
      return
    }
    formData.set("category", category)
    formData.set("frequency", frequency)
    selectedChildren.forEach((id) => formData.append("child_ids", id))
    if (frequency === "custom") formData.set("custom_days", customDays.join(","))
    formData.set("times_per_period", String(timesPeriod))
    formData.set("period_unit", periodUnit)
    formData.set("requires_photo", String(requiresPhoto))
    setError(null)
    startTransition(async () => {
      const result = await createChore(formData)
      if (result?.error) setError(result.error)
      else router.push("/parent/chores")
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon">
          <Link href="/parent/chores"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Add a Mission</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="title">Mission name *</Label>
              <Input id="title" name="title" placeholder="e.g. Room Reset" required autoFocus />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Short description (optional)</Label>
              <Textarea id="description" name="description" placeholder="What should your child understand before starting?" rows={2} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="checklist_items">Checklist (optional)</Label>
              <Textarea
                id="checklist_items"
                name="checklist_items"
                placeholder={"Make your bed\nPut clothes away\nClear the floor"}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">One simple step per line. Kids check these before Mission Check.</p>
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
              <Label>Schedule</Label>
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
                  Kids can complete this mission {timesPeriod}× per {periodUnit}
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
                <Label htmlFor="credit_value">Credit reward *</Label>
                <Input id="credit_value" name="credit_value" type="number" min="1" max="1000" defaultValue="10" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="xp_value">XP reward</Label>
                <Input id="xp_value" name="xp_value" type="number" min="0" max="1000" defaultValue="10" />
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={requiresPhoto}
              onClick={() => setRequiresPhoto((value) => !value)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-violet-600 active:scale-[.99]"
            >
              <span>
                <span className="block text-sm font-semibold">Require Mission Photo</span>
                <span className="text-xs text-muted-foreground">Child must attach photo proof before Mission Check.</span>
              </span>
              <span
                className={`relative h-7 w-12 rounded-full transition-colors ${requiresPhoto ? "bg-violet-600" : "bg-slate-200"}`}
              >
                <span
                  className={`absolute top-1 size-5 rounded-full bg-white transition-transform ${requiresPhoto ? "translate-x-6" : "translate-x-1"}`}
                />
              </span>
            </button>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="due_time">Due time (optional)</Label>
                <Input id="due_time" name="due_time" type="time" />
              </div>
            </div>

            {children.length > 0 && (
              <div className="space-y-2">
                <Label>Assign to children (optional)</Label>
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
                {isPending ? "Saving…" : "Add Mission"}
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
