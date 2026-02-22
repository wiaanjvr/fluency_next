# Cold Start Collaborative Filtering (System 8)

ML microservice that assigns new users (< 50 interaction events) to the nearest
learner cluster, providing recommended module paths and complexity levels until
enough personal data accumulates.

## Architecture

```
POST /ml/coldstart/assign-cluster
  → Extract signup features (native lang, target lang, CEFR, goals)
  → Scale with saved StandardScaler
  → Predict nearest K-Means centroid
  → Return cluster profile (module path, complexity, vocab band)
```

## Quick Start

```bash
# Install dependencies
pip install -r ml/cold_start/requirements.txt

# Start the service (port 8600)
python -m ml.cold_start.scripts.serve

# Trigger training (requires mature users in DB)
python -m ml.cold_start.scripts.train

# Or via API:
curl -X POST http://localhost:8600/ml/coldstart/train
```

## API Endpoints

| Method | Path                             | Description                                |
| ------ | -------------------------------- | ------------------------------------------ |
| POST   | `/ml/coldstart/assign-cluster`   | Assign user to nearest cluster             |
| POST   | `/ml/coldstart/check-graduation` | Check if user should graduate (≥50 events) |
| POST   | `/ml/coldstart/train`            | Trigger K-Means training                   |
| GET    | `/ml/coldstart/health`           | Health check                               |

### Assign Cluster

```bash
curl -X POST http://localhost:8600/ml/coldstart/assign-cluster \
  -H "Content-Type: application/json" \
  -d '{
    "nativeLanguage": "en",
    "targetLanguage": "fr",
    "cefrLevel": "A1",
    "goals": ["conversational", "travel"],
    "userId": "optional-uuid"
  }'
```

Response:

```json
{
  "clusterId": 3,
  "recommendedPath": ["conversation", "listening", "story", "flashcard", ...],
  "defaultComplexityLevel": 1,
  "estimatedVocabStart": "top_500",
  "confidence": 0.82,
  "recommendedModuleWeights": { "conversation": 0.25, "listening": 0.20, ... },
  "assignmentId": "uuid",
  "usingModel": true
}
```

## Clustering Features (8 groups)

1. **Native language** — one-hot
2. **Target language** — one-hot
3. **CEFR level** — ordinal (0–6)
4. **Learning goals** — multi-hot (conversational, formal, travel, business)
5. **Avg session length** — standardised minutes
6. **Preferred time of day** — one-hot (morning/afternoon/evening/night)
7. **Module preference distribution** — 8-dim simplex
8. **Forgetting curve steepness** — derived from DKT p_forget outputs

## Cold Start Flow

1. Signup → collect native language, target language, CEFR estimate, goals
2. `POST /ml/coldstart/assign-cluster` → nearest centroid
3. Inherit cluster's `recommendedModuleWeights` + `defaultComplexityLevel`
4. At 50 events → `POST /ml/coldstart/check-graduation` → transition to personal model

## Configuration

| Env Var              | Default               | Description                      |
| -------------------- | --------------------- | -------------------------------- |
| `COLD_START_PORT`    | 8600                  | API port                         |
| `COLD_START_API_KEY` | (empty)               | Shared secret for auth           |
| `COLD_START_HOST`    | 0.0.0.0               | Host to bind                     |
| `COLD_START_WORKERS` | 1                     | Uvicorn workers                  |
| `DKT_SERVICE_URL`    | http://localhost:8100 | DKT service for forgetting curve |
| `DKT_API_KEY`        | (empty)               | DKT service auth                 |
