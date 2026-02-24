import type { ReactNode } from "react"
import Footer from "@/components/shared/Footer"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        {/* Animated gradient orbs — theme-aware (--orb-1, --orb-2 from data-color-theme) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-3xl animate-pulse"
            style={{ backgroundColor: 'var(--orb-1)', animationDuration: '8s' }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl animate-pulse"
            style={{ backgroundColor: 'var(--orb-2)', animationDuration: '10s', animationDelay: '2s' }}
          />
        </div>

        {children}
      </div>
    </>
  )
}
