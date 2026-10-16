import os
from app.core.config import settings

celery_app = None
try:
    from celery import Celery
    celery_app = Celery(
        "ats_screening",
        broker=settings.REDIS_URL,
        backend=settings.REDIS_URL
    )
    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
    )
except ImportError:
    pass
