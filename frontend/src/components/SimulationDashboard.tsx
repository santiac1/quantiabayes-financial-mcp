"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useSimulationSocket } from "../hooks/useSimulationSocket";

interface TransactionInput {
  timestamp: number;
  amount: number;
}

export default function SimulationDashboard() {
  const [taskId, setTaskId] = useState<string | undefined>(undefined);
  const [currentBalance, setCurrentBalance] = useState<number>(2500);
  const [transactions] = useState<TransactionInput[]>([
    { timestamp: 1, amount: 200 },
    { timestamp: 2, amount: 180 },
    { timestamp: 3, amount: 210 },
    { timestamp: 4, amount: 195 },
    { timestamp: 5, amount: 205 },
  ]);
  const { updates, status, result } = useSimulationSocket(taskId);

  const progressLabel = useMemo(() => {
    const last = updates[updates.length - 1];
    if (status === "SUCCESS" || status === "SUCCESSFUL") return "Completado";
    if (status === "FAILURE" || status === "ERROR") return last?.meta?.message || last?.error || "Error";
    return last?.meta?.message || "Esperando...";
  }, [status, updates]);

  const handleStart = async () => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
    const response = await fetch(`${apiBase}/simulate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: "demo-user",
        current_balance: currentBalance,
        transactions,
      }),
    });

    if (!response.ok) {
      console.error("No se pudo lanzar la simulación");
      return;
    }

    const data = await response.json();
    setTaskId(data.task_id);
  };

  return (
    <section className="space-y-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Simulación Asíncrona</h2>
          <p className="text-sm text-slate-400">Stan + PPO con WebSockets para monitorear progreso.</p>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            Saldo actual
            <input
              type="number"
              value={currentBalance}
              onChange={(event) => setCurrentBalance(Number(event.target.value))}
              className="w-32 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1 text-right"
            />
          </label>
        </div>
        <button
          onClick={handleStart}
          className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-emerald-950 hover:bg-emerald-400"
        >
          Lanzar simulación
        </button>
      </div>

      <div className="space-y-2">
        <div className="h-2 w-full rounded-full bg-slate-800">
          <div
            className="h-2 rounded-full bg-emerald-400 transition-all"
            style={{ width: status === "SUCCESS" ? "100%" : status === "PENDING" ? "5%" : "60%" }}
          />
        </div>
        <p className="text-sm text-slate-300">{progressLabel}</p>
      </div>

      {result && (
        <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Proyección Bayesiana</h3>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
              Acción sugerida: {result.recommended_action}
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <AreaChart data={result.forecast_data}>
                <defs>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }} />
                <Area type="monotone" dataKey="mean" stroke="#34d399" fill="url(#colorForecast)" strokeWidth={2} />
                <Area type="monotone" dataKey="upper" stroke="#22c55e" fillOpacity={0} strokeDasharray="4 4" />
                <Area type="monotone" dataKey="lower" stroke="#22c55e" fillOpacity={0} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}
