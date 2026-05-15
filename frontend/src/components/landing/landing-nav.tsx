"use client"

import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { Activity } from "lucide-react"

export function LandingNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Activity className="h-6 w-6 text-accent transition-transform group-hover:scale-110" />
          <span className="font-semibold text-lg tracking-tight">Quantum</span>
        </Link>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-6">
            <Link href="#methodology" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Methodology
            </Link>
            <Link href="#whitepaper" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Whitepaper
            </Link>
            <Link href="#research" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Research
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}
