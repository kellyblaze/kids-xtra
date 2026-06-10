export default function KidLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      {children}
    </div>
  )
}
