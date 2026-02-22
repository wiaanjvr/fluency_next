# Complexity Level Predictor (ML System 5)

Predicts the optimal story complexity level and recommended session length for a given user before a session starts.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Next.js Frontend                                            │
│    POST /api/ml/session/plan  →  proxy to Python service     │
└───────────────────────┬──────────────────────────────────────┘
                        │ HTTP
┌───────────────────────▼──────────────────────────────────────┐
│  Python FastAPI (:8400)                                      │
│                                                              │
│  POST /ml/session/plan    → predict session plan             │
│  POST /ml/session/train   → trigger training (admin)         │
│  GET  /ml/session/health  → health check                     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  XGBoost     │  │  Feature     │  │  Supabase         │  │
│  │  Classifier  │  │  Engineering │  │  (session data)   │  │
│  │  (1-5 level) │  │              │  │                   │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
│                                                              │
│  ┌──────────────┐                    ┌───────────────────┐  │
│  │  XGBoost     │                    │  DKT Service      │  │
│  │  Regressor   │                    │  (:8100) → p_recall│  │
│  │  (word count)│                    │                   │  │
│  └──────────────┘                    └───────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Features (8 dimensions)

| #   | Feature                              | Source      | Description                                          |
| --- | ------------------------------------ | ----------- | ---------------------------------------------------- |
| 0   | `timeOfDay`                          | Clock       | 0=morning, 1=afternoon, 2=evening, 3=night           |
| 1   | `dayOfWeek`                          | Clock       | 0=Mon … 6=Sun                                        |
| 2   | `daysSinceLastSession`               | Supabase    | Log1p-scaled days since last completed session       |
| 3   | `lastSessionCognitiveLoad`           | Supabase    | Estimated cognitive load from previous session (0-1) |
| 4   | `lastSessionCompletionRate`          | Supabase    | correctCount / totalWords from previous session      |
| 5   | `currentStreakDays`                  | Supabase    | Consecutive days with at least one session (log1p)   |
| 6   | `averageSessionPerformanceLast7Days` | Supabase    | Mean completion rate over last 7 days                |
| 7   | `pRecallAvg`                         | DKT (:8100) | Average p_recall across due words from DKT model     |

## Model

Two XGBoost models trained jointly:

1. **Complexity Classifier** — `multi:softprob` with 5 classes
   - Predicts optimal complexity level (1-5)
   - Output includes confidence (softmax probability of selected class)

2. **Session Length Regressor** — `reg:squarederror`
   - Predicts recommended word count
   - Duration derived from word count & complexity level

### Complexity Levels

| Level | Description          | Grammar                           |
| ----- | -------------------- | --------------------------------- |
| 1     | Simple present tense | Basic SVO sentences               |
| 2     | Present + past tense | Simple conjunctions               |
| 3     | Multiple tenses      | Relative clauses                  |
| 4     | All tenses           | Complex conjunctions              |
| 5     | Full complexity      | Subordinate clauses, mixed tenses |

### Training Signal

Historical sessions are labelled based on their outcomes:

- **Optimal** = cognitive load in [0.25, 0.50] AND completion rate ≥ 0.75
- If overloaded (load > 0.50) → label = actual_level - 1
- If under-loaded (load < 0.25, completion high) → label = actual_level + 1

## API

### `POST /ml/session/plan`

```json
// Request
{ "userId": "uuid-string" }

// Response
{
  "complexityLevel": 3,
  "recommendedWordCount": 60,
  "recommendedDurationMinutes": 12.0,
  "confidence": 0.78,
  "usingModel": true,
  "planId": "uuid",
  "features": {
    "time_of_day": 1.0,
    "day_of_week": 3.0,
    "days_since_last_session": 0.69,
    "last_session_cognitive_load": 0.35,
    "last_session_completion_rate": 0.85,
    "current_streak_days": 1.79,
    "avg_performance_last_7_days": 0.78,
    "p_recall_avg": 0.7
  }
}
```

### `POST /ml/session/train`

```json
// Request (optional)
{ "force": true }

// Response
{
  "status": "completed",
  "totalSamples": 5000,
  "complexityAccuracy": 0.62,
  "complexityWithin1": 0.91,
  "wordCountRmse": 12.5,
  "trainingTimeSeconds": 4.2
}
```

### `GET /ml/session/health`

```json
{
  "status": "ok",
  "service": "complexity-predictor",
  "modelLoaded": true,
  "version": "0.1.0"
}
```

## Graceful Degradation

The system has three fallback tiers:

1. **Model available** → XGBoost prediction with confidence score
2. **Model not loaded** → Heuristic rules based on feature values (confidence = 0.3)
3. **New user / no data** → Safe defaults: level 1, 40 words, 8 min (confidence = 0.2)

## Local Development

### Prerequisites

```bash
cd lingua_2.0
pip install -r ml/complexity_predictor/requirements.txt
```

### Run the server

```bash
python -m ml.complexity_predictor.scripts.serve --port 8400 --reload
```

### Train the model

```bash
python -m ml.complexity_predictor.scripts.train
```

### Run tests

```bash
pytest ml/complexity_predictor/tests/ -v
```

## Docker

```bash
docker build -f ml/complexity_predictor/Dockerfile -t lingua-complexity-predictor .
docker run -p 8400:8400 --env-file .env.local lingua-complexity-predictor
```

## Environment Variables

| Variable                           | Default                 | Description                |
| ---------------------------------- | ----------------------- | -------------------------- |
| `COMPLEXITY_PREDICTOR_HOST`        | `0.0.0.0`               | Server bind address        |
| `COMPLEXITY_PREDICTOR_PORT`        | `8400`                  | Server port                |
| `COMPLEXITY_PREDICTOR_WORKERS`     | `1`                     | Uvicorn workers            |
| `COMPLEXITY_PREDICTOR_API_KEY`     | _(empty)_               | Shared secret for auth     |
| `COMPLEXITY_PREDICTOR_SERVICE_URL` | `http://localhost:8400` | URL used by Next.js client |
| `DKT_SERVICE_URL`                  | `http://localhost:8100` | DKT service for p_recall   |
| `DKT_API_KEY`                      | _(empty)_               | DKT service auth key       |
| `NEXT_PUBLIC_SUPABASE_URL`         | —                       | Supabase project URL       |
| `SUPABASE_SERVICE_ROLE_KEY`        | —                       | Supabase service role key  |

## Database

Migration: `supabase/migrations/20260222250000_complexity_predictor.sql`

### Tables

- `session_plans` — stores each prediction for audit & future training labels

### Functions

- `get_user_session_features(p_user_id)` — single-query feature extraction
- `get_labelled_sessions(p_min_sessions, p_limit)` — historical data for training
