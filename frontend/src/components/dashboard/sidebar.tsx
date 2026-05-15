"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, BarChart3, Bot, Home, Settings, TrendingUp, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { useIsMobile } from "@/hooks/use-mobile"

const navItems = [
  { icon: Home, label: "Dashboard", href: "/dashboard" },
  { icon: Wallet, label: "Portfolio", href: "/dashboard/portfolio" },
  { icon: TrendingUp, label: "Analytics", href: "/dashboard/analytics" },
  { icon: BarChart3, label: "Reports", href: "/dashboard/reports" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const isMobile = useIsMobile()

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-card border-r border-border transition-all duration-300",
        isMobile ? "w-16" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Activity className="h-5 w-5 text-accent" />
          </div>
          {!isMobile && <span className="font-semibold text-lg tracking-tight">Quantum</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isMobile && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <div className={cn("flex items-center", isMobile ? "justify-center" : "justify-between")}>
          {!isMobile && (
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-chart-1" />
              <span className="text-xs text-muted-foreground">AI Online</span>
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}
