import { Star } from "lucide-react"
import Link from "next/link"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      <header className="p-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <Star className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="font-bold text-xl text-foreground">Kids Xtra</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
      <footer className="p-4 text-center text-xs text-muted-foreground">
        <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        {" · "}
        <Link href="/terms" className="hover:underline">Terms of Service</Link>
      </footer>
    </div>
  )
}
