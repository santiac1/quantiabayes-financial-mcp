from __future__ import annotations

from celery import Celery
from kombu import Exchange, Queue

from .config import get_settings

settings = get_settings()

celery_app = Celery(
    "banorte_mcp",
    broker=settings.broker_url,
    backend=settings.result_backend,
    include=["app.worker"],
)

celery_app.conf.task_default_queue = "default"
celery_app.conf.task_queues = (
    Queue("default", Exchange("default"), routing_key="default"),
    Queue("simulations", Exchange("simulations"), routing_key="simulations"),
)
celery_app.conf.task_routes = {
    "app.worker.run_simulation_task": {"queue": "simulations"},
}
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_max_tasks_per_child=20,
    broker_transport_options={"visibility_timeout": 3600},
)


@celery_app.task(bind=True)
def healthcheck(self) -> str:
    """Simple task to validate Celery is alive."""
    return "ok"
