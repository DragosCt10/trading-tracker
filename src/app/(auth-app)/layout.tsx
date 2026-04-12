import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Link
        href="/"
        className="absolute top-6 left-6 z-50 flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-[var(--tc-primary)] dark:hover:text-[var(--tc-primary)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Home
      </Link>
      {children}
    </>
  )
}
