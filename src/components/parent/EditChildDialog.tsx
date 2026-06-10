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
import { updateChildProfile } from "@/app/actions/child-actions"
import { AVATAR_OPTIONS, COLOR_THEMES, AVATAR_EMOJI } from "@/lib/constants"
import { Pencil } from "lucide-react"

interface ChildData {
  id: string
  name: string
  nickname: string | null
  avatar_key: string | null
  color_theme: string | null
}

export function EditChildDialog({ child }: { child: ChildData }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedAvatar, setSelectedAvatar] = useState(child.avatar_key ?? "star")
  const [selectedColor, setSelectedColor] = useState(child.color_theme ?? "purple")

  function handleSubmit(formData: FormData) {
    formData.set("avatar_key", selectedAvatar)
    formData.set("color_theme", selectedColor)
    setError(null)
    startTransition(async () => {
      const result = await updateChildProfile(child.id, formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Edit {child.name}&nbsp;
            <span className="text-xl">{AVATAR_EMOJI[child.avatar_key ?? "star"] ?? "⭐"}</span>
          </DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name *</Label>
            <Input id="edit-name" name="name" defaultValue={child.name} required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-nickname">Nickname (optional)</Label>
            <Input id="edit-nickname" name="nickname" defaultValue={child.nickname ?? ""} placeholder="e.g. Buddy" />
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
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
