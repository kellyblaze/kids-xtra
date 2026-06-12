import type { Metadata } from "next"
import { Geist } from "next/font/google"
import Script from "next/script"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Kids Xtra — Extra effort. Extra rewards. Extra growth.",
  description:
    "A parent-controlled chore credit and reward app for children ages 6–10. Turn chores into wins.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kids Xtra",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster richColors position="top-right" />
        <Script src="/sw-register.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
