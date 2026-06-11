"use client"

import { useState, useTransition } from "react"
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
import { createReward } from "@/app/actions/reward-actions"
import { REWARD_CATEGORIES } from "@/lib/constants"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewRewardPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState(REWARD_CATEGORIES[0]?.value ?? "experience")

  function handleSubmit(formData: FormData) {
    formData.set("category", category)
    setError(null)
    startTransition(async () => {
      const result = await createReward(formData)
      if (result?.error) setError(result.error)
      else router.push("/parent/rewards")
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon">
          <Link href="/parent/rewards"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Add a reward</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" placeholder="e.g. Movie night" required autoFocus />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Tell your child what they're working towards…"
                rows={2}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REWARD_CATEGORIES.map(({ value, label, emoji }) => (
                      <SelectItem key={value} value={value}>
                        {emoji} {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="credit_cost">Credits required *</Label>
                <Input
                  id="credit_cost"
                  name="credit_cost"
                  type="number"
                  min="1"
                  max="99999"
                  defaultValue="50"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quantity_available">
                Quantity available <span className="text-muted-foreground font-normal">(leave blank for unlimited)</span>
              </Label>
              <Input
                id="quantity_available"
                name="quantity_available"
                type="number"
                min="1"
                placeholder="Unlimited"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? "Saving…" : "Add reward"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/parent/rewards")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
