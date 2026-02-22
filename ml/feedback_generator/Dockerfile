FROM python:3.12-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY ml/feedback_generator/requirements.txt /app/ml/feedback_generator/requirements.txt
RUN pip install --no-cache-dir -r /app/ml/feedback_generator/requirements.txt

# Copy source
COPY ml/feedback_generator/ /app/ml/feedback_generator/

# Copy .env files (for Supabase + LLM keys — in production, use env vars instead)
COPY .env.local /app/.env.local
COPY .env /app/.env

# Expose the Feedback Generator API port
EXPOSE 8500

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import httpx; r = httpx.get('http://localhost:8500/ml/feedback/health'); r.raise_for_status()"

# Run the server
CMD ["python", "-m", "ml.feedback_generator.scripts.serve", "--host", "0.0.0.0", "--port", "8500"]
