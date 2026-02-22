FROM python:3.12-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY ml/dkt/requirements.txt /app/ml/dkt/requirements.txt
RUN pip install --no-cache-dir -r /app/ml/dkt/requirements.txt

# Copy source
COPY ml/dkt/ /app/ml/dkt/

# Copy .env files (for Supabase keys — in production, use env vars instead)
COPY .env.local /app/.env.local
COPY .env /app/.env

# Expose the DKT API port
EXPOSE 8100

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import httpx; r = httpx.get('http://localhost:8100/ml/dkt/health'); r.raise_for_status()"

# Run the server
CMD ["python", "-m", "ml.dkt.scripts.serve", "--host", "0.0.0.0", "--port", "8100"]
