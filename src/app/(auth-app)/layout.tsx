import type { ReactNode } from "react"

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

        {children}
      </div>
    </>
  )
}
