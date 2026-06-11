"use client"

import { useState } from "react"
import { setChildPin } from "@/app/actions/kid-auth"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"

export function SetChildPinForm({ childId }: { childId: string }) {
  const [pin, setPin] = useState("")
  const [confirm, setConfirm] = useState("")
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (!/^\d{4}$/.test(pin)) { setError("PIN must be exactly 4 digits."); return }
    if (pin !== confirm) { setError("PINs don't match."); return }
    setPending(true)
    try {
      const result = await setChildPin(childId, pin)
      if (result.error) setError(result.error)
      else { setSuccess(true); setPin(""); setConfirm("") }
    } catch {
      setError("Something went wrong.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 border-2 border-red-200 px-4 py-3 text-sm font-bold text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border-2 border-emerald-200 px-4 py-3 text-sm font-bold text-emerald-700">
          <CheckCircle className="w-4 h-4 shrink-0" />PIN saved! Child can now log in.
        </div>
      )}
      <div className="flex gap-3 flex-wrap">
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="New PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          required
          className="flex-1 min-w-0 rounded-2xl border-2 border-slate-200 h-11 px-4 font-black text-lg tracking-widest focus:outline-none focus:border-violet-400"
        />
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="Confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
          required
          className="flex-1 min-w-0 rounded-2xl border-2 border-slate-200 h-11 px-4 font-black text-lg tracking-widest focus:outline-none focus:border-violet-400"
        />
        <button
          type="submit"
          disabled={pending || pin.length !== 4 || confirm.length !== 4}
          className="shrink-0 flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-black px-5 py-2.5 rounded-2xl shadow-[0_3px_0_#5b21b6] hover:shadow-[0_1px_0_#5b21b6] hover:translate-y-[2px] transition-all"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save PIN"}
        </button>
      </div>
      <p className="text-xs text-slate-400 font-medium">4 digits only — the child enters this at kid login.</p>
    </form>
  )
}
