import { Star } from "lucide-react"
import Link from "next/link"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-violet-50 to-white">
      <header className="p-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-9 h-9 rounded-2xl bg-violet-600 flex items-center justify-center shadow-[0_3px_0_#5b21b6]">
            <Star className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="font-black text-xl text-violet-700">Kids Xtra</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
      <footer className="p-4 text-center text-xs font-bold text-slate-400">
        <Link href="/privacy" className="hover:text-violet-600 transition-colors">Privacy Policy</Link>
        {" · "}
        <Link href="/terms" className="hover:text-violet-600 transition-colors">Terms of Service</Link>
      </footer>
    </div>
  )
}
