"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { suggestChores, type ChoreSuggestion } from "@/app/actions/ai-actions"
import { createChore } from "@/app/actions/chore-actions"
import { CATEGORY_EMOJI, FREQUENCY_LABELS } from "@/lib/constants"
import { Sparkles, Plus, Loader2, RefreshCw } from "lucide-react"

export function SuggestChoresButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<ChoreSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  async function fetchSuggestions() {
    setLoading(true)
    setError(null)
    const result = await suggestChores()
    if (result.error) setError(result.error)
    else setSuggestions(result.suggestions ?? [])
    setLoading(false)
  }

  function handleOpen() {
    setOpen(true)
    setAdded(new Set())
    fetchSuggestions()
  }

  function handleAddChore(suggestion: ChoreSuggestion) {
    setAdding(suggestion.title)
    startTransition(async () => {
      const formData = new FormData()
      formData.set("title", suggestion.title)
      formData.set("description", suggestion.description)
      formData.set("category", suggestion.category)
      formData.set("frequency", suggestion.frequency)
      formData.set("credit_value", String(suggestion.credit_value))
      await createChore(formData)
      setAdded((prev) => new Set(prev).add(suggestion.title))
      setAdding(null)
      router.refresh()
    })
  }

  return (
    <>
      <Button variant="outline" onClick={handleOpen}>
        <Sparkles className="w-4 h-4 mr-2 text-violet-500" />
        Suggest chores
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500" />
              AI Chore Suggestions
            </DialogTitle>
            <DialogDescription>
              Age-appropriate chore ideas tailored to your family. Tap any to add it instantly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            {loading && (
              <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Generating ideas…</span>
              </div>
            )}

            {error && (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchSuggestions}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Try again
                </Button>
              </div>
            )}

            {!loading && !error && suggestions.map((s) => {
              const isAdded = added.has(s.title)
              const isAdding = adding === s.title
              const emoji = CATEGORY_EMOJI[s.category as keyof typeof CATEGORY_EMOJI] ?? "📋"
              const freqLabel = FREQUENCY_LABELS[s.frequency] ?? s.frequency

              return (
                <div
                  key={s.title}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                    isAdded ? "bg-emerald-50 border-emerald-200" : "bg-card hover:bg-muted/40"
                  }`}
                >
                  <span className="text-xl shrink-0 mt-0.5">{emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description}</p>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      <Badge variant="secondary" className="text-xs">⭐ {s.credit_value}</Badge>
                      <Badge variant="outline" className="text-xs">{freqLabel}</Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isAdded ? "default" : "outline"}
                    disabled={isAdded || isAdding}
                    onClick={() => handleAddChore(s)}
                    className={`shrink-0 ${isAdded ? "bg-emerald-500 hover:bg-emerald-500 text-white" : ""}`}
                  >
                    {isAdding
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : isAdded
                      ? "Added ✓"
                      : <><Plus className="w-4 h-4 mr-1" />Add</>}
                  </Button>
                </div>
              )
            })}

            {!loading && !error && suggestions.length > 0 && (
              <Button variant="ghost" size="sm" className="w-full" onClick={fetchSuggestions}>
                <RefreshCw className="w-4 h-4 mr-2" /> Regenerate suggestions
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
