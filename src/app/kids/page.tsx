"use client"

import { useState } from "react"
import { Loader2, AlertCircle } from "lucide-react"
import { getChildrenByFamilyCode, kidLogin } from "@/app/actions/kid-auth"
import { AVATAR_EMOJI } from "@/lib/constants"

type Step = "code" | "pick" | "pin"
type Child = { id: string; name: string; avatar_key: string | null }

export default function KidLoginPage() {
  const [step, setStep] = useState<Step>("code")
  const [familyCode, setFamilyCode] = useState("")
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [pin, setPin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!familyCode.trim()) return
    setError(null)
    setPending(true)
    try {
      const result = await getChildrenByFamilyCode(familyCode)
      if (result.error || !result.children) {
        setError(result.error ?? "Not found.")
      } else if (result.children.length === 0) {
        setError("No children found for this family code.")
      } else {
        setChildren(result.children)
        setStep("pick")
      }
    } catch {
      setError("Something went wrong.")
    } finally {
      setPending(false)
    }
  }

  function handlePickChild(child: Child) {
    setSelectedChild(child)
    setPin("")
    setError(null)
    setStep("pin")
  }

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedChild || pin.length !== 4) return
    setError(null)
    setPending(true)
    try {
      const result = await kidLogin(familyCode, selectedChild.id, pin)
      if (result && "error" in result && result.error) {
        setError(result.error)
        setPin("")
      } else if (result && "childId" in result && result.childId) {
        // Hard navigation ensures the cookie is sent on the next request
        // (required for compatibility with older browsers like Amazon Silk)
        window.location.href = `/kid/${result.childId}/dashboard`
      }
    } catch {
      setError("Something went wrong.")
    } finally {
      setPending(false)
    }
  }

  function handlePinKey(digit: string) {
    if (pin.length < 4) setPin((p) => p + digit)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-100 to-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-violet-600 flex items-center justify-center mx-auto mb-4 shadow-[0_8px_0_#5b21b6]">
            <span className="text-4xl">🎮</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800">Kids Xtra</h1>
          <p className="text-slate-500 font-medium mt-1">Log in to see your missions!</p>
        </div>

        {step === "code" && (
          <div className="rounded-3xl border-4 border-violet-200 bg-white p-6 shadow-[0_6px_0_#ddd6fe]">
            <h2 className="font-black text-xl text-slate-800 mb-1">Enter your family code</h2>
            <p className="text-sm text-slate-500 font-medium mb-4">Ask a parent for your family&apos;s code</p>
            {error && (
              <div className="flex items-center gap-2 rounded-2xl bg-red-50 border-2 border-red-200 px-4 py-3 text-sm font-bold text-red-700 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <input
                value={familyCode}
                onChange={(e) => setFamilyCode(e.target.value.toUpperCase())}
                placeholder="e.g. JONES42"
                maxLength={10}
                required
                autoCapitalize="characters"
                className="w-full rounded-2xl border-4 border-slate-200 h-14 px-4 text-center text-2xl font-black tracking-widest uppercase focus:outline-none focus:border-violet-400"
              />
              <button
                type="submit"
                disabled={pending || !familyCode.trim()}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-black text-lg py-4 rounded-2xl shadow-[0_4px_0_#5b21b6] hover:shadow-[0_2px_0_#5b21b6] hover:translate-y-[2px] transition-all"
              >
                {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Next →"}
              </button>
            </form>
          </div>
        )}

        {step === "pick" && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="font-black text-2xl text-slate-800">Who are you? 👋</h2>
              <p className="text-slate-500 font-medium mt-1">Tap your name</p>
            </div>
            {children.map((child) => {
              const emoji = AVATAR_EMOJI[child.avatar_key ?? "star"] ?? "⭐"
              return (
                <button
                  key={child.id}
                  onClick={() => handlePickChild(child)}
                  className="w-full flex items-center gap-4 p-5 rounded-3xl border-4 border-violet-200 bg-white shadow-[0_6px_0_#ddd6fe] hover:translate-y-[3px] hover:shadow-[0_3px_0_#ddd6fe] active:translate-y-[6px] active:shadow-none transition-all"
                >
                  <div className="w-14 h-14 rounded-2xl bg-violet-50 border-2 border-violet-200 flex items-center justify-center text-3xl shrink-0">
                    {emoji}
                  </div>
                  <span className="text-2xl font-black text-violet-700">{child.name}</span>
                </button>
              )
            })}
            <button onClick={() => { setStep("code"); setError(null) }}
              className="w-full text-sm font-bold text-slate-400 hover:text-slate-600 py-2">
              ← Different family code
            </button>
          </div>
        )}

        {step === "pin" && selectedChild && (
          <div className="rounded-3xl border-4 border-violet-200 bg-white p-6 shadow-[0_6px_0_#ddd6fe]">
            <div className="text-center mb-6">
              <div className="text-5xl mb-2">
                {AVATAR_EMOJI[selectedChild.avatar_key ?? "star"] ?? "⭐"}
              </div>
              <h2 className="font-black text-2xl text-slate-800">Hi, {selectedChild.name}!</h2>
              <p className="text-slate-500 font-medium mt-1">Enter your 4-digit PIN</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-2xl bg-red-50 border-2 border-red-200 px-4 py-3 text-sm font-bold text-red-700 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}

            <form onSubmit={handlePinSubmit}>
              <div className="flex justify-center gap-3 mb-6">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`w-14 h-14 rounded-2xl border-4 flex items-center justify-center text-2xl font-black transition-all ${pin.length > i ? "border-violet-600 bg-violet-50 text-violet-700" : "border-slate-200 bg-slate-50"}`}>
                    {pin.length > i ? "●" : ""}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={d === ""}
                    onClick={() => d === "⌫" ? setPin((p) => p.slice(0, -1)) : d ? handlePinKey(d) : undefined}
                    className={`h-16 rounded-2xl text-2xl font-black transition-all ${
                      d === "" ? "invisible" :
                      d === "⌫" ? "bg-slate-100 hover:bg-slate-200 text-slate-600 border-2 border-slate-200" :
                      "bg-violet-50 hover:bg-violet-100 text-violet-700 border-2 border-violet-200 shadow-[0_3px_0_#ddd6fe] hover:shadow-[0_1px_0_#ddd6fe] hover:translate-y-[2px]"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={pin.length !== 4 || pending}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-black text-lg py-4 rounded-2xl shadow-[0_4px_0_#5b21b6] hover:shadow-[0_2px_0_#5b21b6] hover:translate-y-[2px] transition-all"
              >
                {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Let's go! 🚀"}
              </button>
            </form>

            <button onClick={() => { setStep("pick"); setError(null); setPin("") }}
              className="w-full text-sm font-bold text-slate-400 hover:text-slate-600 py-3 mt-2">
              ← Not me
            </button>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 font-medium mt-8">
          Parent?{" "}
          <a href="/login" className="underline hover:text-slate-600">Parent login →</a>
        </p>
      </div>
    </div>
  )
}
