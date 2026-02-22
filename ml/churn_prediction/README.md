# ML System 9: Churn Prediction & Engagement Rescue

Predicts session abandonment risk and triggers rescue interventions to improve user engagement and retention.

## Overview

This microservice provides two classifiers:

1. **Pre-session churn model**: Predicts whether a user will skip their session today
2. **Mid-session abandonment model**: Predicts whether a user will quit mid-session

When risk is detected, the system selects from a prioritised list of **rescue interventions** to keep the user engaged.

## Architecture

```
ml/churn_prediction/
├── api/            # FastAPI endpoints
├── data/           # Supabase data access layer
├── model/          # Pre-session, mid-session models + interventions
├── training/       # Training pipeline + scheduler
├── scripts/        # CLI entry points (serve, train)
├── tests/          # Pytest test suite
├── config.py       # Dataclass-based configuration
├── Dockerfile      # Container deployment
└── requirements.txt
```

## API Endpoints

| Method | Path                         | Description                          |
| ------ | ---------------------------- | ------------------------------------ |
| POST   | `/ml/churn/pre-session-risk` | Predict daily churn risk for a user  |
| POST   | `/ml/churn/mid-session-risk` | Predict mid-session abandonment risk |
| POST   | `/ml/churn/train`            | Trigger model training (admin)       |
| GET    | `/ml/churn/health`           | Health check                         |

### Pre-session risk

```bash
curl -X POST http://localhost:8700/ml/churn/pre-session-risk \
  -H "Content-Type: application/json" \
  -d '{"userId": "abc-123"}'
```

Response:

```json
{
  "churnProbability": 0.78,
  "triggerNotification": true,
  "notificationHook": "12 words you're about to forget",
  "usingModel": true,
  "predictionId": "pred-uuid"
}
```

### Mid-session risk

```bash
curl -X POST http://localhost:8700/ml/churn/mid-session-risk \
  -H "Content-Type: application/json" \
  -d '{"userId": "abc-123", "sessionId": "sess-456", "wordsCompletedSoFar": 10}'
```

Response:

```json
{
  "abandonmentProbability": 0.72,
  "recommendedIntervention": {
    "type": "shorten_session",
    "message": "Let's make this easier — just 5 more words to go!",
    "payload": {
      "original_remaining": 10,
      "new_remaining": 5,
      "reduction_percent": 50
    }
  },
  "usingModel": true,
  "snapshotId": "snap-uuid"
}
```

## Rescue Interventions (Priority Order)

1. **Shorten session** — Reduce remaining word count by 50%
2. **Switch to easier content** — Serve only words with `recognitionScore > 0.7`
3. **Switch module** — Offer flashcard drill instead of current module
4. **Celebrate micro-progress** — Surface an encouraging stat
5. **Suggest break** — Recommend a 5-minute break after 25+ minutes

## Models

### Pre-session classifier

- **Initial**: Logistic Regression (balanced class weights)
- **Upgrade**: Gradient Boosted Tree (`model_type: "gradient_boosted_tree"` in config)
- **Features**: daysSinceLastSession, currentStreakDays, lastSessionCognitiveLoad, lastSessionCompletion, averageSessionsPerWeek, dayOfWeek, timeOfDay
- **Target**: didNotSessionToday (measured 24h later)
- **Threshold**: churnProbability > 0.7 triggers notification

### Mid-session classifier

- **Initial**: Logistic Regression (balanced class weights)
- **Upgrade**: Gradient Boosted Tree
- **Features**: consecutiveErrors, responseTimeTrend, sessionDurationSoFar, cognitiveLoad, wordsRemainingInSession
- **Target**: abandonedSession
- **Threshold**: abandonmentProbability > 0.65 triggers intervention
- **Frequency**: Runs every 5 words during a session

## Quick Start

### Install dependencies

```bash
pip install -r ml/churn_prediction/requirements.txt
```

### Run the server

```bash
python -m ml.churn_prediction.scripts.serve --port 8700
```

### Train models

```bash
python -m ml.churn_prediction.scripts.train --model both
```

### Run tests

```bash
pytest ml/churn_prediction/tests/ -v
```

### Docker

```bash
docker build -f ml/churn_prediction/Dockerfile -t lingua-churn-prediction .
docker run -p 8700:8700 --env-file .env.local lingua-churn-prediction
```

## Database

Migration: `supabase/migrations/20260222280000_churn_prediction.sql`

### Tables

- `churn_predictions` — Daily pre-session risk predictions per user
- `session_abandonment_snapshots` — Mid-session risk checkpoints (every 5 words)
- `rescue_interventions` — Logged rescue actions taken

### SQL Functions

- `get_pre_session_training_data(p_lookback_days)` — Aggregated features + labels for churn model
- `get_mid_session_training_data(p_min_session_words)` — Snapshot features + labels for abandonment model

## Configuration

Environment variables:

- `CHURN_PREDICTION_HOST` (default: `0.0.0.0`)
- `CHURN_PREDICTION_PORT` (default: `8700`)
- `CHURN_PREDICTION_WORKERS` (default: `1`)
- `CHURN_PREDICTION_API_KEY` (optional, for auth)
- `NEXT_PUBLIC_SUPABASE_URL` (required)
- `SUPABASE_SERVICE_ROLE_KEY` (required)

## Port

**8700** (System 9 in the ML microservice fleet)
