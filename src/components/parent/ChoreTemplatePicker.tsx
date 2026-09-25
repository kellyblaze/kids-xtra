"use client"

import { useState, useTransition } from "react"
import { importChoreTemplates } from "@/app/actions/template-actions"
import { CHORE_TEMPLATES, AGE_GROUPS, type AgeGroup } from "@/lib/chore-templates"

const CATEGORY_EMOJI: Record<string, string> = {
  chore: "🧹",
  morning_routine: "☀️",
  health_hygiene: "🪥",
  learning: "📚",
  kindness: "💛",
}

export function ChoreTemplatePicker() {
  const [open, setOpen] = useState(false)
  const [activeAge, setActiveAge] = useState<AgeGroup>("6-8")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const templates = CHORE_TEMPLATES.filter((t) => t.ageGroup === activeAge)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleImport() {
    startTransition(async () => {
      const result = await importChoreTemplates(Array.from(selected))
      if ("error" in result) {
        setMessage(`Error: ${result.error}`)
      } else {
        setMessage(`✅ Imported ${result.imported} chore${result.imported !== 1 ? "s" : ""}!`)
        setSelected(new Set())
        setOpen(false)
      }
    })
  }

  if (!open) {
    return (
      <div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 border-2 border-violet-300 text-violet-700 font-bold text-sm px-4 py-2 rounded-2xl hover:bg-violet-50 transition-colors"
        >
          📚 Import from library
        </button>
        {message && <p className="mt-2 text-sm font-bold text-emerald-600">{message}</p>}
      </div>
    )
  }

  return (
    <div className="rounded-3xl border-4 border-violet-200 bg-violet-50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-slate-700">Chore template library</h3>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {AGE_GROUPS.map((age) => (
          <button
            key={age}
            onClick={() => setActiveAge(age)}
            className={`px-3 py-1.5 rounded-full text-xs font-black transition-colors ${
              activeAge === age
                ? "bg-violet-600 text-white"
                : "bg-white border-2 border-violet-200 text-violet-700 hover:bg-violet-100"
            }`}
          >
            Ages {age}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {templates.map((t) => (
          <label
            key={t.id}
            className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition-colors ${
              selected.has(t.id)
                ? "bg-violet-100 border-2 border-violet-300"
                : "bg-white border-2 border-slate-200 hover:border-violet-200"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(t.id)}
              onChange={() => toggle(t.id)}
              className="mt-0.5 accent-violet-600"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span>{CATEGORY_EMOJI[t.category] ?? "📋"}</span>
                <span className="font-bold text-sm text-slate-800">{t.title}</span>
                <span className="ml-auto text-xs font-black text-amber-600 shrink-0">{t.creditValue} ⭐</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <p className="text-sm font-bold text-slate-600">{selected.size} selected</p>
        <button
          onClick={handleImport}
          disabled={selected.size === 0 || isPending}
          className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-black text-sm px-5 py-2 rounded-2xl shadow-[0_3px_0_#5b21b6] transition-colors"
        >
          {isPending ? "Importing…" : `Import ${selected.size > 0 ? selected.size : ""} chore${selected.size !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  )
}
