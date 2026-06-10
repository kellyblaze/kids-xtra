"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { signUp } from "@/app/actions/auth"
import { Loader2, AlertCircle } from "lucide-react"

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)

    const formData = new FormData(e.currentTarget)
    const result = await signUp(formData)

    if (result?.error) {
      setError(result.error)
      setPending(false)
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create your family account</CardTitle>
        <CardDescription>
          Start building great habits with your kids today.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="displayName">Your name</Label>
            <Input id="displayName" name="displayName" placeholder="e.g. Sarah" required autoComplete="name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="familyName">Family name</Label>
            <Input id="familyName" name="familyName" placeholder="e.g. The Johnson Family" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" name="email" type="email" placeholder="parent@example.com" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" placeholder="At least 8 characters" required minLength={8} autoComplete="new-password" />
          </div>
          <p className="text-xs text-muted-foreground">
            By creating an account you agree to our{" "}
            <Link href="/terms" className="underline hover:text-foreground">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
            Parents are responsible for their children&apos;s use of this app.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
            Create account
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">Log in</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
