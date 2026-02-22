FROM python:3.12-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY ml/cold_start/requirements.txt /app/ml/cold_start/requirements.txt
RUN pip install --no-cache-dir -r /app/ml/cold_start/requirements.txt

# Copy source
COPY ml/cold_start/ /app/ml/cold_start/

# Copy .env files (for Supabase keys — in production, use env vars instead)
COPY .env.local /app/.env.local
COPY .env /app/.env

# Expose the Cold Start API port
EXPOSE 8600

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import httpx; r = httpx.get('http://localhost:8600/ml/coldstart/health'); r.raise_for_status()"

# Run the server
CMD ["python", "-m", "ml.cold_start.scripts.serve", "--host", "0.0.0.0", "--port", "8600"]
