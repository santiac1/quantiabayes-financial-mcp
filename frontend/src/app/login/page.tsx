"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Activity, ArrowLeft, Eye, EyeOff, Lock, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"

export default function LoginPage() {
    const router = useRouter()
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [accessId, setAccessId] = useState("")
    const [secureKey, setSecureKey] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        // Simulate authentication
        await new Promise((resolve) => setTimeout(resolve, 1500))

        router.push("/dashboard")
    }

    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            {/* Background gradient effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-chart-1/10 via-transparent to-chart-2/10" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(10,132,255,0.1),transparent_70%)]" />

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="text-sm">Back</span>
                    </Link>
                    <ThemeToggle />
                </div>
            </nav>

            {/* Login Form */}
            <main className="relative z-10 flex items-center justify-center min-h-screen px-6">
                <Card className="w-full max-w-md glass border-border/50 shadow-2xl">
                    <CardHeader className="text-center pb-8">
                        <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                            <Activity className="h-6 w-6 text-accent" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
                        <CardDescription className="text-muted-foreground">
                            Enter your credentials to access the terminal
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Access ID Input */}
                            <div className="space-y-2">
                                <Label htmlFor="access-id" className="text-sm font-medium">
                                    Access ID
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="access-id"
                                        type="text"
                                        placeholder="Enter your access ID"
                                        value={accessId}
                                        onChange={(e) => setAccessId(e.target.value)}
                                        className="pl-10 h-12 bg-secondary/50 border-border/50 rounded-xl transition-all duration-300 focus:ring-2 focus:ring-accent/50 focus:border-accent"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Secure Key Input */}
                            <div className="space-y-2">
                                <Label htmlFor="secure-key" className="text-sm font-medium">
                                    Secure Key
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="secure-key"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your secure key"
                                        value={secureKey}
                                        onChange={(e) => setSecureKey(e.target.value)}
                                        className="pl-10 pr-10 h-12 bg-secondary/50 border-border/50 rounded-xl transition-all duration-300 focus:ring-2 focus:ring-accent/50 focus:border-accent"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-medium transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                                        <span>Authenticating...</span>
                                    </div>
                                ) : (
                                    "Access Terminal"
                                )}
                            </Button>
                        </form>

                        {/* Footer */}
                        <div className="mt-8 text-center">
                            <p className="text-sm text-muted-foreground">
                                Need access?{" "}
                                <Link href="#" className="text-accent hover:underline transition-colors">
                                    Request credentials
                                </Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
