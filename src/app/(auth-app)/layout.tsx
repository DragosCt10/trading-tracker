import type { ReactNode } from "react"
import Footer from "@/components/shared/Footer"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center">
        {/* Animated gradient orbs - more subtle */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl animate-pulse" 
              style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-green-500/10 dark:bg-green-500/5 rounded-full blur-3xl animate-pulse" 
              style={{ animationDuration: '10s', animationDelay: '2s' }} />
        </div>
        
        {children}
      </div>
    </>
  )
}
