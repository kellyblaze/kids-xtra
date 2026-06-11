"use client"

import { useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signUp } from "@/app/actions/auth"
import { Loader2, AlertCircle } from "lucide-react"

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)

    try {
      const formData = new FormData(e.currentTarget)
      const result = await signUp(formData)
      if (result?.error) {
        setError(result.error)
        setPending(false)
      }
    } catch {
      setError("Something went wrong. Please try again.")
      setPending(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-3xl bg-violet-600 flex items-center justify-center mx-auto mb-4 shadow-[0_6px_0_#5b21b6]">
          <span className="text-3xl">👨‍👩‍👧</span>
        </div>
        <h1 className="text-3xl font-black text-slate-800">Create your family!</h1>
        <p className="text-slate-500 font-medium mt-1">Start building great habits with your kids.</p>
      </div>

      <div className="rounded-3xl border-4 border-slate-200 bg-white p-6 shadow-[0_6px_0_#e2e8f0]">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-2xl bg-red-50 border-2 border-red-200 px-4 py-3 text-sm font-bold text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="displayName" className="font-black text-slate-700">Your name</Label>
            <Input id="displayName" name="displayName" placeholder="e.g. Sarah" required autoComplete="name" className="rounded-2xl border-2 h-12 font-medium" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="familyName" className="font-black text-slate-700">Family name</Label>
            <Input id="familyName" name="familyName" placeholder="e.g. The Johnson Family" required className="rounded-2xl border-2 h-12 font-medium" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="font-black text-slate-700">Email address</Label>
            <Input id="email" name="email" type="email" placeholder="parent@example.com" required autoComplete="email" className="rounded-2xl border-2 h-12 font-medium" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="font-black text-slate-700">Password</Label>
            <Input id="password" name="password" type="password" placeholder="At least 8 characters" required minLength={8} autoComplete="new-password" className="rounded-2xl border-2 h-12" />
          </div>
          <p className="text-xs text-slate-400 font-medium">
            By creating an account you agree to our{" "}
            <Link href="/terms" className="underline hover:text-slate-600">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline hover:text-slate-600">Privacy Policy</Link>.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-black text-lg py-3.5 rounded-2xl shadow-[0_4px_0_#5b21b6] hover:shadow-[0_2px_0_#5b21b6] hover:translate-y-[2px] transition-all"
          >
            {pending && <Loader2 className="w-5 h-5 animate-spin" />}
            {pending ? "Creating account…" : "Create account 🚀"}
          </button>
        </form>
      </div>

      <p className="text-sm font-bold text-slate-500 text-center mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-violet-600 font-black hover:text-violet-800">Log in</Link>
      </p>
    </div>
  )
}
