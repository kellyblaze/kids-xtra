"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createChildProfile } from "@/app/actions/child-actions"
import { AVATAR_OPTIONS, COLOR_THEMES } from "@/lib/constants"
import { Plus } from "lucide-react"

export function AddChildDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedAvatar, setSelectedAvatar] = useState("star")
  const [selectedColor, setSelectedColor] = useState("purple")

  function handleSubmit(formData: FormData) {
    formData.set("avatar_key", selectedAvatar)
    formData.set("color_theme", selectedColor)
    setError(null)
    startTransition(async () => {
      const result = await createChildProfile(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
        setSelectedAvatar("star")
        setSelectedColor("purple")
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button><Plus className="mr-2 w-4 h-4" /> Add child</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a child</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="add-name">Name *</Label>
            <Input id="add-name" name="name" placeholder="e.g. Alex" required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-nickname">Nickname (optional)</Label>
            <Input id="add-nickname" name="nickname" placeholder="e.g. Buddy" />
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
      </DialogContent>
    </Dialog>
  )
}
