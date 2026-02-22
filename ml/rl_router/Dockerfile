FROM python:3.12-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY ml/rl_router/requirements.txt /app/ml/rl_router/requirements.txt
RUN pip install --no-cache-dir -r /app/ml/rl_router/requirements.txt

# Copy source
COPY ml/rl_router/ /app/ml/rl_router/

# Copy .env files (for Supabase keys — in production, use env vars instead)
COPY .env.local /app/.env.local
COPY .env /app/.env

# Expose the RL Router API port
EXPOSE 8800

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import httpx; r = httpx.get('http://localhost:8800/ml/router/health'); r.raise_for_status()"

# Run the server
CMD ["python", "-m", "ml.rl_router.scripts.serve", "--host", "0.0.0.0", "--port", "8800"]
