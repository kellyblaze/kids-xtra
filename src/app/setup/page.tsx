"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2 } from "lucide-react"
import { completeSetup } from "@/app/actions/setup"

export default function SetupPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const formData = new FormData(e.currentTarget)
      const result = await completeSetup(formData)
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
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-violet-600 flex items-center justify-center mx-auto mb-4 shadow-[0_6px_0_#5b21b6]">
            <span className="text-3xl">👨‍👩‍👧</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800">Finish setting up</h1>
          <p className="text-slate-500 font-medium mt-1">Your account needs a family name to continue.</p>
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
              <label htmlFor="displayName" className="block text-sm font-black text-slate-700">Your name</label>
              <input id="displayName" name="displayName" placeholder="e.g. Sarah" required autoComplete="name"
                className="w-full rounded-2xl border-2 border-slate-200 h-12 px-4 font-medium focus:outline-none focus:border-violet-400" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="familyName" className="block text-sm font-black text-slate-700">Family name</label>
              <input id="familyName" name="familyName" placeholder="e.g. The Johnson Family" required
                className="w-full rounded-2xl border-2 border-slate-200 h-12 px-4 font-medium focus:outline-none focus:border-violet-400" />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-black text-lg py-3.5 rounded-2xl shadow-[0_4px_0_#5b21b6] hover:shadow-[0_2px_0_#5b21b6] hover:translate-y-[2px] transition-all"
            >
              {pending && <Loader2 className="w-5 h-5 animate-spin" />}
              {pending ? "Setting up…" : "Continue 🚀"}
            </button>
          </form>
        </div>

        <p className="text-xs text-slate-400 text-center mt-4 font-medium">
          Wrong account?{" "}
          <button onClick={() => router.push("/login")} className="underline hover:text-slate-600">Sign in again</button>
        </p>
      </div>
    </div>
  )
}
