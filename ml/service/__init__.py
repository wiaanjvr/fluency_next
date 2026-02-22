"""
ml.service — Unified Lingua ML Gateway Service.

Aggregates ALL ML module routers into a single FastAPI application running
on port 8900.  Also exposes the cross-cutting endpoints:

  DELETE /ml/user/{user_id}  — GDPR / POPIA right-to-erasure
  GET    /ml/health           — overall health of all ML sub-services
  GET    /ml/cache/health     — Redis cache health
  GET    /ml/worker/health    — Celery worker health

Usage:
    uvicorn ml.service.app:app --host 0.0.0.0 --port 8900
"""
