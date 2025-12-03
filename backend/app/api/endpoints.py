from __future__ import annotations

import asyncio
from typing import Any, Dict

from celery.result import AsyncResult
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.celery_app import celery_app
from app.models.schemas import SimulationRequest
from app.worker import run_simulation_task

router = APIRouter()


@router.post("/simulate")
async def enqueue_simulation(request: SimulationRequest) -> Dict[str, str]:
    task = run_simulation_task.delay(request.dict())
    return {"task_id": task.id}


@router.websocket("/ws/simulation/{task_id}")
async def simulation_updates(websocket: WebSocket, task_id: str) -> None:
    await websocket.accept()
    try:
        while True:
            result = AsyncResult(task_id, app=celery_app)
            meta = result.info if isinstance(result.info, dict) else {}
            payload: Dict[str, Any] = {"state": result.state, "meta": meta}

            if result.successful():
                payload["result"] = result.result
                await websocket.send_json(payload)
                break

            if result.failed():
                payload["error"] = meta.get("message", "Tarea fallida")
                await websocket.send_json(payload)
                break

            await websocket.send_json(payload)
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        return
    except Exception as exc:  # pragma: no cover - defensive
        await websocket.send_json({"state": "ERROR", "meta": {"message": str(exc)}})
