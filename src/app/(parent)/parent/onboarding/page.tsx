"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { createChildProfile } from "@/app/actions/child-actions"
import { AVATAR_OPTIONS, COLOR_THEMES } from "@/lib/constants"
import { CheckCircle, Plus, ArrowRight } from "lucide-react"

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<"welcome" | "addChild" | "done">("welcome")
  const [childrenAdded, setChildrenAdded] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedAvatar, setSelectedAvatar] = useState("star")
  const [selectedColor, setSelectedColor] = useState("purple")

  function handleAddChild(formData: FormData) {
    formData.set("avatar_key", selectedAvatar)
    formData.set("color_theme", selectedColor)
    setError(null)
    startTransition(async () => {
      const result = await createChildProfile(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setChildrenAdded((n) => n + 1)
        setStep("done")
      }
    })
  }

  if (step === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-6xl">🎉</div>
          <h1 className="text-3xl font-bold text-foreground">Welcome to Kids Xtra!</h1>
          <p className="text-muted-foreground">
            Let&apos;s get your family set up. Start by adding your first child so they can earn credits for completing chores.
          </p>
          <Button size="lg" className="w-full" onClick={() => setStep("addChild")}>
            Add your first child <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push("/parent/dashboard")}>
            Skip for now
          </Button>
        </div>
      </div>
    )
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold">
            {childrenAdded === 1 ? "First child added!" : `${childrenAdded} children added!`}
          </h2>
          <p className="text-muted-foreground">Now add some chores so your kids can start earning credits.</p>
          <div className="flex flex-col gap-3">
            <Button size="lg" onClick={() => setStep("addChild")}>
              <Plus className="mr-2 w-4 h-4" /> Add another child
            </Button>
            <Button variant="outline" size="lg" onClick={() => router.push("/parent/chores/new")}>
              Add a chore
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/parent/dashboard")}>
              Go to dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold">Add a child</h2>
          <p className="text-muted-foreground text-sm mt-1">Choose a name, avatar, and colour theme</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <form action={handleAddChild} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" placeholder="e.g. Alex" required autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nickname">Nickname (optional)</Label>
                <Input id="nickname" name="nickname" placeholder="e.g. Buddy" />
              </div>
              <div className="space-y-2">
                <Label>Avatar</Label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_OPTIONS.map(({ key, emoji }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedAvatar(key)}
                      className={`aspect-square rounded-xl text-2xl flex items-center justify-center border-2 transition-colors ${
                        selectedAvatar === key
                          ? "border-primary bg-primary/10"
                          : "border-transparent bg-slate-100 hover:bg-slate-200"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Colour theme</Label>
                <div className="flex gap-2">
                  {COLOR_THEMES.map(({ value, bg }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelectedColor(value)}
                      className={`w-8 h-8 rounded-full ${bg} border-2 transition-transform ${
                        selectedColor === value ? "border-foreground scale-110" : "border-transparent"
                      }`}
                    />
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Saving…" : "Add child"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Button variant="ghost" size="sm" className="w-full" onClick={() => router.push("/parent/dashboard")}>
          Skip for now
        </Button>
      </div>
    </div>
  )
}
