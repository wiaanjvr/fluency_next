# Cognitive Load Estimator

Real-time cognitive load scoring service for Lingua learning sessions. Runs as an independent Python microservice alongside the DKT service.

## Architecture

```
┌─────────────────┐     fire-and-forget     ┌──────────────────────────┐
│  Next.js Backend │ ────────────────────►  │  Cognitive Load Service  │
│  (API routes)    │                         │  (FastAPI, port 8200)    │
│                  │ ◄──── GET /session/:id  │                          │
└────────┬─────────┘                         └─────────┬────────────────┘
         │                                             │
         │  /api/events/session/start                  │  init_session()
         │  /api/events                                │  record_event()
         │  /api/events/session/end                    │  end_session()
         │                                             │
         │  /api/stories/generate                      │  get_session_load()
         │  reads load before generating               │  (adjusts difficulty)
         │                                             │
         ▼                                             ▼
┌─────────────────┐                         ┌──────────────────────────┐
│    Supabase      │                         │     In-Memory Store      │
│  interaction_events                        │  (per-session rolling    │
│  session_summaries                         │   window of EventLoads)  │
│  user_baselines                            │                          │
└─────────────────┘                         └──────────────────────────┘
```

## Cognitive Load Formula

```
cognitiveLoad = (currentResponseTime - baselineResponseTime) / baselineResponseTime
```

Normalised to `[0, 1]`. Values > 0.5 indicate high cognitive load.

### Baseline Resolution (most specific wins)

1. **Per-module + per-difficulty-bucket** — e.g. average RT for "new" words in `story_engine`
2. **Per-module** — e.g. average RT across all `flashcards` events
3. **Global user baseline** — EMA from `user_baselines` table
4. **System default** — 3,000 ms

## API Endpoints

| Method | Path                                     | Description                           |
| ------ | ---------------------------------------- | ------------------------------------- |
| `POST` | `/ml/cognitive-load/session/init`        | Initialise tracking for a session     |
| `POST` | `/ml/cognitive-load/session/event`       | Record a single event's response time |
| `GET`  | `/ml/cognitive-load/session/{sessionId}` | Get current load snapshot             |
| `POST` | `/ml/cognitive-load/session/end`         | Finalise and persist cognitive load   |
| `GET`  | `/ml/cognitive-load/health`              | Health check                          |

### Session Load Response

```json
{
  "currentLoad": 0.42,
  "trend": "increasing",
  "recommendedAction": "continue",
  "eventCount": 15,
  "consecutiveHighLoad": 0,
  "avgLoad": 0.35,
  "recentLoads": [0.3, 0.35, 0.4, 0.42]
}
```

### Recommended Actions

| Action        | Trigger                                                          |
| ------------- | ---------------------------------------------------------------- |
| `continue`    | Load is within normal range                                      |
| `simplify`    | `currentLoad > 0.6` for 3+ consecutive words, or `avgLoad > 0.6` |
| `end-session` | `currentLoad > 0.8`                                              |

## Integration Points

### 1. Session Lifecycle (automatic)

The Next.js event routes fire-and-forget to the cognitive load service:

- **Session start** → `initCognitiveLoadSession()`
- **Each event** → `recordCognitiveLoadEvent()`
- **Session end** → `endCognitiveLoadSession()` → persists `estimatedCognitiveLoad` to `session_summaries`

### 2. Story Engine (automatic)

When generating a new story segment (`POST /api/stories/generate`), if a `session_id` is provided:

- Fetches current cognitive load snapshot
- If `currentLoad > 0.6`: reduces new word % by 50% and story length by 30%
- Logs the adjustment to console

### 3. Frontend Hook

```tsx
import { useCognitiveLoad } from "@/hooks/useCognitiveLoad";

function SessionView({ sessionId }) {
  const { snapshot, shouldSimplify, shouldBreak } = useCognitiveLoad(
    sessionId,
    {
      pollInterval: 5000,
      onBreakRecommended: () => showBreakDialog(),
      onSimplifyRecommended: () => console.log("Simplifying..."),
    },
  );

  return (
    <div>
      {shouldBreak && <BreakPrompt />}
      {snapshot && (
        <LoadIndicator load={snapshot.currentLoad} trend={snapshot.trend} />
      )}
    </div>
  );
}
```

## Running Locally

```bash
# Install dependencies
cd ml/cognitive_load
pip install -r requirements.txt

# Start the service
python -m ml.cognitive_load.scripts.serve --port 8200

# Run tests
pytest ml/cognitive_load/tests/ -v
```

### Environment Variables

| Variable                     | Default                 | Description                           |
| ---------------------------- | ----------------------- | ------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`   | —                       | Supabase project URL                  |
| `SUPABASE_SERVICE_ROLE_KEY`  | —                       | Service role key for DB access        |
| `COGNITIVE_LOAD_HOST`        | `0.0.0.0`               | Bind host                             |
| `COGNITIVE_LOAD_PORT`        | `8200`                  | Bind port                             |
| `COGNITIVE_LOAD_API_KEY`     | —                       | Shared secret (optional in dev)       |
| `COGNITIVE_LOAD_SERVICE_URL` | `http://localhost:8200` | Used by Next.js to reach this service |

## Docker

```bash
docker build -f ml/cognitive_load/Dockerfile -t lingua-cognitive-load .
docker run -p 8200:8200 --env-file .env.local lingua-cognitive-load
```

## Database Migration

The service depends on an additional migration that creates Postgres functions for efficient baseline computation:

```
supabase/migrations/20260222230000_cognitive_load_functions.sql
```

This adds:

- `get_user_module_baselines(user_id)` — per-module avg response times
- `get_user_difficulty_baselines(user_id)` — per-module+bucket avg response times
- `get_session_cognitive_load_summary(session_id)` — SQL fallback for session load
- Optimised partial indexes for the aggregation queries
