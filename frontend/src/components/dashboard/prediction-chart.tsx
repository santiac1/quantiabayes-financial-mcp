"use client"

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { SimulationResult } from "@/types/simulation"

interface PredictionChartProps {
  data: SimulationResult | null
  isLoading: boolean
  error: string | null
}

export function PredictionChart({ data, isLoading, error }: PredictionChartProps) {
  // Transform backend data to Recharts format
  const chartData = data?.forecast_data.map((point) => ({
    day: `Day ${point.day}`,
    mean: point.mean,
    lower: point.lower,
    upper: point.upper,
  })) || []

  return (
    <Card className="bg-card border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300 col-span-full lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Cash Flow Projection (Bayesian)
          </CardTitle>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-chart-1" />
              <span className="text-muted-foreground">Mean</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-chart-2 opacity-40" />
              <span className="text-muted-foreground">Uncertainty</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[300px]">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-chart-1"></div>
              <p className="text-sm text-muted-foreground">Ejecutando simulación Bayesiana...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-destructive">⚠️ Error</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!data && !isLoading && !error && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-muted-foreground">No hay datos disponibles</p>
              <p className="text-xs text-muted-foreground">
                Ejecuta una simulación para ver proyecciones
              </p>
            </div>
          </div>
        )}

        {/* Chart with Data */}
        {data && !isLoading && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {/* Gradient for mean line */}
                <linearGradient id="meanGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>

                {/* Gradient for uncertainty band */}
                <linearGradient id="uncertaintyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
                labelStyle={{ color: "var(--foreground)" }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, ""]}
              />

              {/* Uncertainty band (shaded area between lower and upper) */}
              <Area
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill="url(#uncertaintyGradient)"
                fillOpacity={1}
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="none"
                fill="var(--card)"
                fillOpacity={1}
              />

              {/* Mean prediction line */}
              <Area
                type="monotone"
                dataKey="mean"
                stroke="var(--chart-1)"
                strokeWidth={3}
                fill="url(#meanGradient)"
                dot={{ fill: "var(--chart-1)", r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
