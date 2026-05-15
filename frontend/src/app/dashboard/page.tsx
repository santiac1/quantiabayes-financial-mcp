"use client"

import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { BalanceCard } from "@/components/dashboard/balance-card"
import { RiskGauge } from "@/components/dashboard/risk-gauge"
import { PredictionChart } from "@/components/dashboard/prediction-chart"
import { SimulationControls } from "@/components/dashboard/simulation-controls"
import { AIAssistant } from "@/components/dashboard/ai-assistant"
import { useSimulation } from "@/hooks/useSimulation"
import { Lightbulb, TrendingUp, Wallet, ShieldCheck } from "lucide-react"

export default function DashboardPage() {
    const { isLoading, progress, data, error, runSimulation } = useSimulation()

    // Map backend recommendation to user-friendly text
    const getRecommendationDisplay = () => {
        if (!data?.recommended_action) return null

        const actionMap: Record<string, { icon: any; text: string; color: string }> = {
            AHORRAR_AGRESIVAMENTE: {
                icon: Wallet,
                text: "Ahorrar Agresivamente",
                color: "text-green-500",
            },
            INVERTIR_EXCEDENTE: {
                icon: TrendingUp,
                text: "Invertir Excedente",
                color: "text-blue-500",
            },
            MANTENER_LIQUIDEZ: {
                icon: ShieldCheck,
                text: "Mantener Liquidez",
                color: "text-yellow-500",
            },
        }

        const recommendation = actionMap[data.recommended_action] || {
            icon: Lightbulb,
            text: data.recommended_action,
            color: "text-chart-1",
        }

        const Icon = recommendation.icon

        return (
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">
                    RL Agent Recommendation
                </h3>
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-muted ${recommendation.color}`}>
                        <Icon className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="font-semibold text-lg">{recommendation.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Based on Bayesian projection and risk analysis
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <DashboardSidebar />

            {/* Main Content */}
            <main className="ml-16 md:ml-64 p-6 transition-all duration-300">
                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Welcome back. Here's your financial overview.
                    </p>
                </header>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Balance Card - Top Left */}
                    <BalanceCard />

                    {/* Risk Gauge - Top Right */}
                    <RiskGauge />

                    {/* RL Recommendation or Quick Stats */}
                    {data?.recommended_action ? (
                        getRecommendationDisplay()
                    ) : (
                        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                            <h3 className="text-sm font-medium text-muted-foreground mb-4">
                                Quick Stats
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Assets</span>
                                    <span className="font-medium">47</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        Active Predictions
                                    </span>
                                    <span className="font-medium">12</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        Model Accuracy
                                    </span>
                                    <span className="font-medium text-chart-1">94.2%</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Prediction Chart - Hero */}
                    <PredictionChart data={data} isLoading={isLoading} error={error} />

                    {/* Simulation Controls - Bottom */}
                    <SimulationControls
                        onRunSimulation={runSimulation}
                        isLoading={isLoading}
                        progress={progress}
                    />
                </div>
            </main>

            {/* AI Assistant */}
            <AIAssistant />
        </div>
    )
}
