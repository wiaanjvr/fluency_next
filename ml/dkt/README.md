# Deep Knowledge Tracing (DKT) — ML Microservice

Transformer-based Deep Knowledge Tracing model that predicts per-word forgetting probability across the entire vocabulary simultaneously. Replaces pure FSRS interval prediction once a user has ≥50 interaction events.

## Architecture

```
Input Sequence (user's InteractionEvent history, up to 512 events)
    │
    ▼
┌───────────────────────────────────────────────────────┐
│  Feature Encoder                                       │
│  word_embed(64) ‖ grammar_tag(16) ‖ module(8)         │
│  ‖ input_mode(8) ‖ continuous(7) → Linear(d_model)    │
└───────────────────────────────────────────────────────┘
    │
    ▼  + Learned Positional Encoding
┌───────────────────────────────────────────────────────┐
│  4× Transformer Encoder (causal attention, d=128)      │
└───────────────────────────────────────────────────────┘
    │
    ├──▶ Recall Head → p_recall per word (via embedding dot-product)
    ├──▶ Forgetting Forecast → p_forget_48h, p_forget_7d
    └──▶ Grammar Mastery Head → per-concept mastery score
```

### Input features per event

| Feature                  | Dimension | Encoding                       |
| ------------------------ | --------- | ------------------------------ |
| Word ID                  | 64        | Learned embedding              |
| Grammar concept ID       | 16        | Learned embedding              |
| Module source            | 8         | Learned embedding (8 modules)  |
| Input mode               | 8         | Learned embedding (4 modes)    |
| `correct`                | 1         | Binary (0/1)                   |
| Response time            | 1         | Normalised by user baseline    |
| Days since last review   | 1         | Log-scaled                     |
| Time of day              | 1         | Ordinal (0-3)                  |
| Day of week              | 1         | Ordinal (0-6)                  |
| Consecutive correct      | 1         | Integer                        |
| Session fatigue proxy    | 1         | Ratio (clipped at 5.0)         |
| Time since session start | 1         | Normalised (0-1, capped at 1h) |

### Outputs

| Output          | Description                                         |
| --------------- | --------------------------------------------------- |
| `p_recall`      | Per-word probability of correct recall right now    |
| `p_forget_48h`  | Predicted probability of forgetting within 48 hours |
| `p_forget_7d`   | Predicted probability of forgetting within 7 days   |
| `mastery_score` | Per grammar concept aggregate mastery (0-1)         |

## Quick Start

### 1. Install dependencies

```bash
cd lingua_2.0
pip install -r ml/dkt/requirements.txt
```

### 2. Set environment variables

The service reads from the project's `.env.local` / `.env` files automatically. Required:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Optional:

```
DKT_API_KEY=your-shared-secret    # for service-to-service auth
DKT_HOST=0.0.0.0
DKT_PORT=8100
```

### 3. Train the model

```bash
# Full train on all data
python -m ml.dkt.scripts.train --mode full

# Fine-tune on last 2 days of events
python -m ml.dkt.scripts.train --mode finetune --days 2
```

### 4. Start the API server

```bash
python -m ml.dkt.scripts.serve --port 8100

# With auto-reload (development)
python -m ml.dkt.scripts.serve --reload
```

### 5. Docker

```bash
docker build -f ml/dkt/Dockerfile -t lingua-dkt .
docker run -p 8100:8100 --env-file .env.local lingua-dkt
```

## API Endpoints

### `POST /ml/dkt/knowledge-state`

Get the full knowledge state for a user.

**Request:**

```json
{ "userId": "uuid-here" }
```

**Response:**

```json
{
  "wordStates": [
    {
      "wordId": "uuid",
      "pRecall": 0.87,
      "pForget48h": 0.05,
      "pForget7d": 0.18
    }
  ],
  "conceptMastery": [{ "tag": "grammar-lesson-uuid", "masteryScore": 0.72 }],
  "eventCount": 342,
  "usingDkt": true
}
```

If `eventCount < 50`, the response will have `usingDkt: false` with a `reason` field explaining that FSRS should be used instead.

### `POST /ml/dkt/predict-session`

Predict performance for planned words in an upcoming session.

**Request:**

```json
{
  "userId": "uuid-here",
  "plannedWords": ["word-uuid-1", "word-uuid-2", "word-uuid-3"]
}
```

**Response:**

```json
{
  "predictions": [
    { "wordId": "word-uuid-1", "predictedRecall": 0.92 },
    { "wordId": "word-uuid-2", "predictedRecall": 0.45 },
    { "wordId": "word-uuid-3", "predictedRecall": 0.78 }
  ],
  "usingDkt": true
}
```

### `POST /ml/dkt/train`

Manually trigger training (admin endpoint).

```json
{ "mode": "full" }
{ "mode": "finetune", "finetuneDays": 3 }
```

### `GET /ml/dkt/health`

```json
{ "status": "ok", "modelLoaded": true, "vocabSize": 1842, "device": "cuda" }
```

## Retraining Schedule

The server automatically runs:

- **Weekly full retrain** — Monday 03:00 UTC (configurable)
- **Daily fine-tune** — 03:00 UTC on all other days

Both are handled by APScheduler running in-process.

## Integration with Next.js Backend

Call the DKT service from your API routes:

```typescript
// src/lib/ml/dkt-client.ts
const DKT_URL = process.env.DKT_SERVICE_URL || "http://localhost:8100";
const DKT_KEY = process.env.DKT_API_KEY || "";

export async function getKnowledgeState(userId: string) {
  const res = await fetch(`${DKT_URL}/ml/dkt/knowledge-state`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": DKT_KEY,
    },
    body: JSON.stringify({ userId }),
  });
  return res.json();
}
```

## FSRS Fallback

Users with fewer than 50 interaction events receive `usingDkt: false` in all responses. The Next.js backend should check this flag and fall back to the existing SM-2/FSRS interval calculator in `src/lib/srs.ts` for these users.

## File Structure

```
ml/dkt/
├── __init__.py
├── config.py                    # Settings from env vars
├── requirements.txt
├── Dockerfile
├── README.md
├── api/
│   ├── app.py                   # FastAPI application factory
│   ├── routes.py                # API endpoint handlers
│   └── schemas.py               # Pydantic request/response models
├── data/
│   ├── supabase_client.py       # Supabase data access (service-role)
│   ├── feature_engineering.py   # Raw events → feature vectors
│   └── dataset.py               # PyTorch Dataset + collate_fn
├── model/
│   ├── transformer_dkt.py       # Transformer DKT architecture
│   └── losses.py                # BCE + smoothness regularisation
├── training/
│   ├── trainer.py               # Training loop (full + fine-tune)
│   └── scheduler.py             # APScheduler cron jobs
├── inference/
│   └── predictor.py             # Inference engine (singleton)
├── scripts/
│   ├── train.py                 # CLI: python -m ml.dkt.scripts.train
│   └── serve.py                 # CLI: python -m ml.dkt.scripts.serve
└── checkpoints/                 # Created at runtime
    ├── dkt_best.pt
    ├── vocab_map.json
    └── grammar_tag_map.json
```
