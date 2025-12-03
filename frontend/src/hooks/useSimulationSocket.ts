import { useEffect, useMemo, useRef, useState } from "react";

interface SimulationMeta {
  message?: string;
}

interface SimulationResult {
  forecast_data: { day: number; mean: number; lower: number; upper: number }[];
  recommended_action: string;
}

interface SimulationUpdate {
  state: string;
  meta?: SimulationMeta;
  result?: SimulationResult;
  error?: string;
}

export function useSimulationSocket(taskId?: string) {
  const [updates, setUpdates] = useState<SimulationUpdate[]>([]);
  const [status, setStatus] = useState<string>("PENDING");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const url = useMemo(() => {
    if (!taskId) return null;
    const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
    const wsBase = base.replace("http", "ws");
    return `${wsBase}/ws/simulation/${taskId}`;
  }, [taskId]);

  useEffect(() => {
    if (!url) return;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const payload: SimulationUpdate = JSON.parse(event.data);
      setStatus(payload.state);
      setUpdates((prev) => [...prev, payload]);
      if (payload.result) setResult(payload.result);
    };

    ws.onerror = () => {
      setUpdates((prev) => [...prev, { state: "ERROR", error: "WebSocket error" }]);
      setStatus("ERROR");
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
    };
  }, [url]);

  return { updates, status, result };
}
