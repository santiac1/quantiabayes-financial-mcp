"use client"

import { useState, useEffect } from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as ChartTooltip } from "recharts"
import { TrendingUp, Shield, Zap, DollarSign, Activity, WifiOff, AlertTriangle } from "lucide-react"

// API Types
interface PortfolioAllocation {
    [asset: string]: number
}

interface DataSourceMeta {
    source: "LIVE" | "CACHED" | "SYNTHETIC"
    timestamp: string
    last_updated?: string
    tickers_count?: number
    warning?: string
}

interface PortfolioOptimizationResponse {
    allocation: PortfolioAllocation
    expected_return: number
    volatility: number
    sharpe_ratio: number
    discrete_allocation: { [asset: string]: number }
    leftover_cash: number
    total_value: number
    tickers_used: string[]
    meta: DataSourceMeta  // NUEVO: metadata de la fuente
}

// Asset colors for Quantum style
const ASSET_COLORS: { [key: string]: string } = {
    SPY: "#3b82f6", // Blue
    QQQ: "#0ea5e9", // Sky blue
    BND: "#10b981", // Green
    NVDA: "#8b5cf6", // Purple
    TSLA: "#ef4444", // Red
    AAPL: "#6b7280", // Gray
    "BTC-USD": "#f59e0b", // Amber
    "ETH-USD": "#a855f7", // Purple
    GLD: "#fbbf24", // Yellow
    TLT: "#22c55e", // Green
}

// Asset icons
const ASSET_ICONS: { [key: string]: any } = {
    SPY: TrendingUp,
    QQQ: TrendingUp,
    BND: Shield,
    NVDA: Zap,
    TSLA: Activity,
    AAPL: DollarSign,
    "BTC-USD": Activity,
    "ETH-USD": Activity,
    GLD: Zap,
    TLT: Shield,
}

export default function PortfolioPage() {
    const [riskTolerance, setRiskTolerance] = useState(0.5)
    const [currentAssets, setCurrentAssets] = useState(10000)
    const [portfolioData, setPortfolioData] = useState<PortfolioOptimizationResponse | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Debounced optimization call
    useEffect(() => {
        const timer = setTimeout(() => {
            optimizePortfolio()
        }, 500) // 500ms debounce

        return () => clearTimeout(timer)
    }, [riskTolerance, currentAssets])

    const optimizePortfolio = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch("http://localhost:8000/api/portfolio/optimize", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    risk_tolerance: riskTolerance,
                    current_assets: currentAssets,
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to optimize portfolio")
            }

            const data: PortfolioOptimizationResponse = await response.json()
            setPortfolioData(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error")
            console.error("Portfolio optimization error:", err)
        } finally {
            setIsLoading(false)
        }
    }

    // Prepare chart data
    const chartData =
        portfolioData?.allocation
            ? Object.entries(portfolioData.allocation)
                .filter(([_, weight]) => weight > 0)
                .map(([asset, weight]) => ({
                    name: asset,
                    value: weight * 100,
                    fill: ASSET_COLORS[asset] || "#94a3b8",
                }))
            : []

    // Risk label
    const getRiskLabel = (value: number) => {
        if (value < 0.3) return "Conservador"
        if (value < 0.7) return "Moderado"
        return "Agresivo"
    }

    // Data source badge renderer
    const renderDataSourceBadge = () => {
        if (!portfolioData?.meta) return null

        const { source, timestamp, last_updated } = portfolioData.meta

        const formatDate = (isoString: string) => {
            const date = new Date(isoString)
            return date.toLocaleString("es-ES", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            })
        }

        if (source === "LIVE") {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20 flex items-center gap-1.5 cursor-help">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                LIVE Data
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Datos en tiempo real desde Yahoo Finance</p>
                            <p className="text-xs text-muted-foreground">Actualizado: {formatDate(timestamp)}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        } else if (source === "CACHED") {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20 flex items-center gap-1.5 cursor-help">
                                <WifiOff className="h-3 w-3" />
                                Offline: Datos del {last_updated ? formatDate(last_updated) : "Cache"}
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>🟠 API no disponible - usando cache en disco</p>
                            <p className="text-xs text-muted-foreground">Última actualización: {last_updated ? formatDate(last_updated) : "Desconocido"}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        } else if (source === "SYNTHETIC") {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 flex items-center gap-1.5 cursor-help">
                                <AlertTriangle className="h-3 w-3" />
                                Simulación de Emergencia
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>🔴 Datos sintéticos - solo para demostración</p>
                            <p className="text-xs text-muted-foreground">No son datos reales de mercado</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        }

        return null
    }

    return (
        <div className="min-h-screen bg-background">
            <DashboardSidebar />

            <main className="ml-16 md:ml-64 p-6 transition-all duration-300">
                {/* Header with dynamic data source indicator */}
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                                Portfolio Optimizer
                            </h1>
                            {renderDataSourceBadge()}
                        </div>
                        <p className="text-muted-foreground mt-1">
                            Optimización cuantitativa usando Modern Portfolio Theory
                        </p>
                    </div>
                </header>

                {/* Risk Tolerance Slider */}
                <Card className="mb-8 bg-gradient-to-br from-card to-card/50 border-border/50 shadow-xl hover:shadow-2xl transition-all duration-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-chart-1" />
                            Perfil de Riesgo
                        </CardTitle>
                        <CardDescription>
                            Ajusta tu tolerancia al riesgo para obtener una asignación óptima personalizada
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">Conservador</span>
                                <span className="text-2xl font-bold bg-gradient-to-r from-chart-1 to-chart-2 bg-clip-text text-transparent">
                                    {getRiskLabel(riskTolerance)}
                                </span>
                                <span className="text-sm font-medium text-muted-foreground">Agresivo</span>
                            </div>
                            <Slider
                                value={[riskTolerance]}
                                onValueChange={([value]) => setRiskTolerance(value)}
                                min={0}
                                max={1}
                                step={0.01}
                                className="cursor-pointer"
                            />
                            <div className="text-center text-xs text-muted-foreground">
                                Riesgo: {(riskTolerance * 100).toFixed(0)}%
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border/50">
                            <label className="text-sm font-medium mb-2 block">Capital Disponible (USD)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="number"
                                    value={currentAssets}
                                    onChange={(e) => setCurrentAssets(Number(e.target.value))}
                                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1 transition-all"
                                    min={1000}
                                    step={1000}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Results Grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-chart-1" />
                    </div>
                ) : error ? (
                    <Card className="border-destructive/50">
                        <CardContent className="p-6 text-center text-destructive">
                            <p>Error: {error}</p>
                        </CardContent>
                    </Card>
                ) : portfolioData ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Efficient Frontier Metrics */}
                        <Card className="lg:col-span-1 bg-gradient-to-br from-chart-1/10 to-chart-1/5 border-chart-1/20">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-chart-1" />
                                    Retorno Esperado
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-bold bg-gradient-to-r from-chart-1 to-chart-2 bg-clip-text text-transparent">
                                    {(portfolioData.expected_return * 100).toFixed(2)}%
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">Anual</p>
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-1 bg-gradient-to-br from-chart-3/10 to-chart-3/5 border-chart-3/20">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-chart-3" />
                                    Volatilidad
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-bold bg-gradient-to-r from-chart-3 to-chart-4 bg-clip-text text-transparent">
                                    {(portfolioData.volatility * 100).toFixed(2)}%
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">Riesgo anual</p>
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-1 bg-gradient-to-br from-chart-2/10 to-chart-2/5 border-chart-2/20">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-chart-2" />
                                    Sharpe Ratio
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-bold bg-gradient-to-r from-chart-2 to-chart-5 bg-clip-text text-transparent">
                                    {portfolioData.sharpe_ratio.toFixed(3)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">Retorno ajustado por riesgo</p>
                            </CardContent>
                        </Card>

                        {/* Allocation Chart */}
                        <Card className="lg:col-span-2 shadow-2xl hover:shadow-3xl transition-shadow duration-500">
                            <CardHeader>
                                <CardTitle>Asignación Óptima</CardTitle>
                                <CardDescription>Distribución del portafolio según frontera eficiente</CardDescription>
                            </CardHeader>
                            <CardContent className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, value }) => `${name}: ${value.toFixed(1)}% `}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell - ${index} `} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <ChartTooltip
                                            formatter={(value: number) => `${value.toFixed(2)}% `}
                                            contentStyle={{
                                                backgroundColor: "hsl(var(--card))",
                                                border: "1px solid hsl(var(--border))",
                                                borderRadius: "8px",
                                            }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Discrete Allocation */}
                        <Card className="lg:col-span-1">
                            <CardHeader>
                                <CardTitle className="text-lg">Asignación Discreta</CardTitle>
                                <CardDescription>Número de acciones a comprar</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {Object.entries(portfolioData.discrete_allocation).map(([asset, shares]) => {
                                    const Icon = ASSET_ICONS[asset] || DollarSign
                                    return (
                                        <div
                                            key={asset}
                                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="p-2 rounded-lg"
                                                    style={{ backgroundColor: `${ASSET_COLORS[asset]} 20` }}
                                                >
                                                    <Icon className="h-4 w-4" style={{ color: ASSET_COLORS[asset] }} />
                                                </div>
                                                <span className="font-medium">{asset}</span>
                                            </div>
                                            <span className="text-lg font-bold">{shares}</span>
                                        </div>
                                    )
                                })}
                                <div className="pt-3 border-t border-border">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Cash Restante</span>
                                        <span className="font-medium">${portfolioData.leftover_cash.toFixed(2)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : null}
            </main>
        </div>
    )
}
