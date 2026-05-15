"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function RiskGauge() {
  const [progress, setProgress] = useState(0)
  const targetProgress = 68
  const riskLevel = "Moderate"

  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(targetProgress)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const getRiskColor = (value: number) => {
    if (value < 30) return "var(--chart-1)"
    if (value < 70) return "var(--chart-2)"
    return "var(--destructive)"
  }

  return (
    <Card className="bg-card border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Current Risk Level</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-secondary"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={getRiskColor(progress)}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{progress}%</span>
            <span className="text-xs text-muted-foreground">{riskLevel}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
