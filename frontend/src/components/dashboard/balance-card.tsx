"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function BalanceCard() {
  const [displayValue, setDisplayValue] = useState(0)
  const targetValue = 2847563.42
  const change = 12.4
  const isPositive = change > 0

  useEffect(() => {
    const duration = 2000
    const steps = 60
    const increment = targetValue / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= targetValue) {
        setDisplayValue(targetValue)
        clearInterval(timer)
      } else {
        setDisplayValue(current)
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  return (
    <Card className="bg-card border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Total Net Worth</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-3xl md:text-4xl font-bold tracking-tight animate-count">{formatCurrency(displayValue)}</p>
          <div className={`flex items-center gap-1 text-sm ${isPositive ? "text-chart-1" : "text-destructive"}`}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span className="font-medium">
              {isPositive ? "+" : ""}
              {change}%
            </span>
            <span className="text-muted-foreground">vs last month</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
