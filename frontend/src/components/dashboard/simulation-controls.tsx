"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Play, RefreshCw } from "lucide-react"
import type { Transaction } from "@/types/simulation"

interface SimulationControlsProps {
  onRunSimulation: (balance: number, transactions?: Transaction[]) => void
  isLoading: boolean
  progress: string
}

export function SimulationControls({ onRunSimulation, isLoading, progress }: SimulationControlsProps) {
  const [balance, setBalance] = useState("10000")

  const handleRunSimulation = () => {
    const balanceValue = parseFloat(balance)
    if (isNaN(balanceValue) || balanceValue <= 0) {
      alert("Por favor ingresa un saldo válido")
      return
    }
    onRunSimulation(balanceValue)
  }

  const handleReset = () => {
    setBalance("10000")
  }

  return (
    <Card className="bg-card border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300 col-span-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Simulation Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {/* Current Balance Input */}
          <div className="space-y-2">
            <Label htmlFor="balance" className="text-sm">
              Current Balance
            </Label>
            <Input
              id="balance"
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="10000"
              disabled={isLoading}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Your current account balance
            </p>
          </div>

          {/* Progress Display */}
          <div className="space-y-2">
            <Label className="text-sm">Status</Label>
            <div className="h-10 flex items-center">
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-chart-1">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="font-medium">{progress || "Processing..."}</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Ready to simulate</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Real-time simulation progress
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Label className="text-sm">Actions</Label>
            <div className="flex gap-2">
              <Button
                onClick={handleRunSimulation}
                disabled={isLoading}
                className="flex-1"
                size="default"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Simulation
                  </>
                )}
              </Button>
              <Button
                onClick={handleReset}
                disabled={isLoading}
                variant="outline"
                size="default"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Execute Bayesian forecasting
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border/30">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-chart-1 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">How it works:</strong> The system uses{" "}
                <span className="text-chart-1 font-medium">Random Walk with Drift</span> and{" "}
                <span className="text-chart-2 font-medium">Hamiltonian Monte Carlo</span> to
                project your cash flow over 7 days. A{" "}
                <span className="text-accent font-medium">PPO RL Agent</span> provides intelligent
                financial recommendations.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
