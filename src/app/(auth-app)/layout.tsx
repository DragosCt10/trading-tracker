import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center app-gradient">
        {/* Theme-aware gradient orbs (--orb-1, --orb-2 from data-color-theme) — static, no animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-3xl"
            style={{ backgroundColor: 'var(--orb-1)' }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl"
            style={{ backgroundColor: 'var(--orb-2)' }}
          />
        </div>

        <Link
          href="/"
          className="absolute top-6 left-6 z-10 flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-[var(--tc-primary)] dark:hover:text-[var(--tc-primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>

        {children}
      </div>
    </>
  )
}
