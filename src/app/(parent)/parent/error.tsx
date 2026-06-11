"use client"

export default function ParentError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">😬</div>
      <h2 className="text-xl font-black text-slate-800 mb-2">Something went wrong</h2>
      <p className="text-slate-500 font-medium text-sm mb-6">A page failed to load. Try refreshing.</p>
      <button
        onClick={reset}
        className="bg-violet-600 text-white font-black px-6 py-3 rounded-2xl shadow-[0_4px_0_#5b21b6] hover:translate-y-[2px] hover:shadow-[0_2px_0_#5b21b6] transition-all"
      >
        Try again
      </button>
    </div>
  )
}
