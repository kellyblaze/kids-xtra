"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, Loader2, Lock } from "lucide-react"

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }

    setPending(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setPending(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push("/parent/dashboard"), 2000)
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="rounded-3xl border-4 border-emerald-200 bg-white p-8 shadow-[0_6px_0_#d1fae5] text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
          <h2 className="text-xl font-black text-slate-800">Password updated!</h2>
          <p className="text-slate-500 font-medium text-sm">
            Taking you to your dashboard…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-3xl bg-violet-600 flex items-center justify-center mx-auto mb-4 shadow-[0_6px_0_#5b21b6]">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-black text-slate-800">Set new password</h1>
        <p className="text-slate-500 font-medium mt-1">
          Choose a strong password for your account.
        </p>
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
            <Label htmlFor="password" className="font-black text-slate-700">
              New password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="rounded-2xl border-2 h-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-slate-400 font-medium pl-1">
              Minimum 8 characters
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="font-black text-slate-700">
              Confirm password
            </Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              required
              autoComplete="new-password"
              className="rounded-2xl border-2 h-12"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-black text-lg py-3.5 rounded-2xl shadow-[0_4px_0_#5b21b6] hover:shadow-[0_2px_0_#5b21b6] hover:translate-y-[2px] transition-all mt-2"
          >
            {pending && <Loader2 className="w-5 h-5 animate-spin" />}
            {pending ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>

      <p className="text-sm font-bold text-slate-500 text-center mt-6">
        <Link href="/login" className="text-violet-600 font-black hover:text-violet-800">
          Back to log in
        </Link>
      </p>
    </div>
  )
}
