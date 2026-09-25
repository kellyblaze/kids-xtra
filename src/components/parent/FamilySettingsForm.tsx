"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { updateFamilySettings, regenerateFamilyCode } from "@/app/actions/family-actions"

interface Props {
  familyId: string
  familyName: string
  displayName: string
  email: string
  familyCode: string
}

export function FamilySettingsForm({ familyName, displayName, email, familyCode: initialCode }: Props) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentCode, setCurrentCode] = useState(initialCode)
  const [codeRotating, setCodeRotating] = useState(false)
  const [codeSuccess, setCodeSuccess] = useState(false)

  function handleSubmit(formData: FormData) {
    setSuccess(false)
    setError(null)
    startTransition(async () => {
      const result = await updateFamilySettings(formData)
      if (result?.error) setError(result.error)
      else setSuccess(true)
    })
  }

  function rotateCode() {
    setCodeRotating(true)
    setCodeSuccess(false)
    startTransition(async () => {
      const result = await regenerateFamilyCode()
      if (result?.error) setError(result.error)
      else if (result?.code) { setCurrentCode(result.code); setCodeSuccess(true) }
      setCodeRotating(false)
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Family code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Kids use this code to log in. Share it with your children.</p>
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-slate-100 rounded-lg px-4 py-2 text-2xl font-black tracking-widest text-slate-800 text-center border-2 border-slate-200">
              {currentCode}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={rotateCode}
              disabled={codeRotating}
              className="shrink-0"
            >
              {codeRotating ? "Rotating…" : "Regenerate"}
            </Button>
          </div>
          {codeSuccess && (
            <p className="text-xs text-amber-700 font-medium">
              ⚠️ Code changed. Kids will need the new code to log in next time.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Family details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="family_name">Family name</Label>
              <Input
                id="family_name"
                name="family_name"
                defaultValue={familyName}
                placeholder="e.g. The Smiths"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="display_name">Your name (optional)</Label>
              <Input
                id="display_name"
                name="display_name"
                defaultValue={displayName}
                placeholder="e.g. Jane"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={email} disabled className="bg-muted" readOnly />
              <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-600">Settings saved.</p>}

            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
