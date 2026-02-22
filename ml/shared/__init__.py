"""
ml.shared — shared infrastructure for all Lingua ML microservices.

Provides:
  - cache     : Redis-based per-user prediction cache (1-hour TTL)
  - prediction_log : Supabase prediction logging
  - celery_app : Celery worker + retraining tasks
  - gdpr      : GDPR/POPIA user-data deletion
"""
