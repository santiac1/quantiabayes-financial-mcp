from __future__ import annotations

from typing import Any, Dict

from celery import states

from app.core.celery_app import celery_app
from app.models.schemas import SimulationRequest
from app.services.simulation_engine import run_simulation


@celery_app.task(bind=True, name="app.worker.run_simulation_task")
def run_simulation_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
    request = SimulationRequest(**payload)

    def progress(message: str) -> None:
        self.update_state(state=states.STARTED, meta={"message": message})

    try:
        result = run_simulation(request, progress)
        return result.dict()
    except Exception as exc:  # pragma: no cover - defensive
        self.update_state(state=states.FAILURE, meta={"message": str(exc)})
        raise
