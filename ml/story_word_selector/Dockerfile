FROM python:3.12-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY ml/story_word_selector/requirements.txt /app/ml/story_word_selector/requirements.txt
RUN pip install --no-cache-dir -r /app/ml/story_word_selector/requirements.txt

# Copy source
COPY ml/story_word_selector/ /app/ml/story_word_selector/

# Copy .env files (for Supabase keys — in production, use env vars instead)
COPY .env.local /app/.env.local
COPY .env /app/.env

# Expose the API port
EXPOSE 8300

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import httpx; r = httpx.get('http://localhost:8300/ml/story/health'); r.raise_for_status()"

# Run the server
CMD ["python", "-m", "ml.story_word_selector.scripts.serve", "--host", "0.0.0.0", "--port", "8300"]
