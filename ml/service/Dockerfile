FROM python:3.12-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install all requirements (gateway needs them all)
COPY ml/churn_prediction/requirements.txt /app/ml/churn_prediction/requirements.txt
COPY ml/dkt/requirements.txt              /app/ml/dkt/requirements.txt
COPY ml/cold_start/requirements.txt       /app/ml/cold_start/requirements.txt
COPY ml/complexity_predictor/requirements.txt /app/ml/complexity_predictor/requirements.txt
COPY ml/feedback_generator/requirements.txt   /app/ml/feedback_generator/requirements.txt
COPY ml/rl_router/requirements.txt            /app/ml/rl_router/requirements.txt
COPY ml/cognitive_load/requirements.txt       /app/ml/cognitive_load/requirements.txt
COPY ml/story_word_selector/requirements.txt  /app/ml/story_word_selector/requirements.txt
COPY ml/shared/requirements.txt               /app/ml/shared/requirements.txt

RUN pip install --no-cache-dir \
    -r /app/ml/churn_prediction/requirements.txt \
    -r /app/ml/dkt/requirements.txt \
    -r /app/ml/cold_start/requirements.txt \
    -r /app/ml/complexity_predictor/requirements.txt \
    -r /app/ml/feedback_generator/requirements.txt \
    -r /app/ml/rl_router/requirements.txt \
    -r /app/ml/cognitive_load/requirements.txt \
    -r /app/ml/story_word_selector/requirements.txt \
    -r /app/ml/shared/requirements.txt

# Copy source
COPY ml/ /app/ml/
COPY .env.local /app/.env.local
COPY .env /app/.env

EXPOSE 8900

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8900/ml/health').raise_for_status()"

CMD ["uvicorn", "ml.service.app:app", "--host", "0.0.0.0", "--port", "8900", "--workers", "2"]
