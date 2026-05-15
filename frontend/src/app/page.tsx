"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LandingNav } from "@/components/landing/landing-nav"
import { HeroVisual } from "@/components/landing/hero-visual"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center min-h-screen px-6 pt-20">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border mb-8">
            <span className="w-2 h-2 rounded-full bg-chart-1 animate-pulse" />
            <span className="text-sm text-muted-foreground">Powered by Bayesian Inference</span>
          </div>

          {/* Hero Typography */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-balance mb-6">
            Predict the{" "}
            <span className="bg-gradient-to-r from-chart-1 via-chart-2 to-chart-3 bg-clip-text text-transparent">
              Unseen
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 text-balance">
            Research-grade financial modeling with probabilistic forecasting. Built for quantitative analysts and
            institutional investors.
          </p>

          {/* CTA Button */}
          <Link href="/login">
            <Button
              size="lg"
              className="glow-button rounded-full px-8 py-6 text-lg font-medium bg-accent hover:bg-accent/90 text-accent-foreground transition-all duration-300 hover:scale-105 active:scale-95"
            >
              Launch Terminal
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Hero Visual */}
        <div className="mt-12 w-full flex justify-center">
          <HeroVisual />
        </div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© 2025 Quantum Finance. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="#methodology" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Methodology (Stan)
            </Link>
            <Link href="#whitepaper" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Whitepaper
            </Link>
            <Link href="#research" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Research
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
