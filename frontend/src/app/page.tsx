import SimulationDashboard from "../components/SimulationDashboard";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Reto Banorte: MCP Financiero</h1>
        <p className="text-slate-300">
          Arquitectura experimental con Inferencia Bayesiana (Stan) y Reinforcement Learning (PPO).
        </p>
      </header>
      <SimulationDashboard />
    </main>
  );
}
