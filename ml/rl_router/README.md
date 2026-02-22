# RL Module Router

Reinforcement learning agent that decides, after each completed activity, what the user should do next across all learning modules.

## Architecture

```
ml/rl_router/
├── __init__.py
├── config.py              # All configuration (dataclasses + env vars)
├── Dockerfile
├── requirements.txt
├── README.md
├── api/
│   ├── app.py             # FastAPI factory with lifespan
│   ├── routes.py          # POST /ml/router/next-activity, /observe-reward, /train
│   └── schemas.py         # Pydantic request/response models
├── data/
│   └── supabase_client.py # All database queries
├── engine/
│   ├── state_assembler.py # Builds 24-dim feature vector from user data
│   ├── cold_start.py      # Rule-based fallback for new users
│   ├── bandit.py          # LinUCB contextual bandit (early phase)
│   ├── ppo_agent.py       # PPO RL agent (advanced phase)
│   ├── reward.py          # Reward function calculator
│   └── router.py          # Main orchestrator
├── training/
│   └── trainer.py         # Batch training pipeline
├── scripts/
│   └── serve.py           # Server entry-point
└── tests/
    └── test_router.py     # Unit tests
```

## Algorithms

### Phase 1: Cold Start (< 50 events)

Rule-based fallback:

- Default to story engine
- Low production score → conjugation drill
- Low pronunciation score → pronunciation session
- Low grammar mastery → grammar lesson

### Phase 2: LinUCB Contextual Bandit (50+ events)

- Disjoint linear models per action
- UCB exploration with α = 1.5
- Online updates from reward observations
- Non-stationarity via matrix decay

### Phase 3: PPO (10,000+ sessions)

- Actor-critic network with shared backbone
- Clipped PPO objective with GAE
- Requires PyTorch

## State Space (24 features)

| Index | Feature                                             |
| ----- | --------------------------------------------------- |
| 0-5   | DKT mastery summary (mean, std, min, max, p25, p75) |
| 6-8   | Last 3 modules used (encoded)                       |
| 9     | Average production score                            |
| 10    | Average pronunciation score                         |
| 11    | Weakest grammar concept mastery                     |
| 12    | Last session cognitive load                         |
| 13    | Estimated available time                            |
| 14    | Days since last session                             |
| 15    | Due word count                                      |
| 16    | Total words learned                                 |
| 17    | Low production word count                           |
| 18    | Low pronunciation word count                        |
| 19-22 | Time encoding (sin/cos hour + day)                  |
| 23    | Session completion rate                             |

## Action Space

- `story_engine` — immersive reading
- `anki_drill` — flashcard review
- `cloze_practice` — fill-in-the-blank
- `conjugation_drill` — verb conjugation
- `pronunciation_session` — speech practice
- `grammar_lesson` — grammar concepts
- `rest` — suggest a break

## API

### `POST /ml/router/next-activity`

```json
// Request
{ "userId": "uuid", "lastCompletedModule": "story_engine", "availableMinutes": 15 }

// Response
{
  "recommendedModule": "conjugation_drill",
  "targetWords": ["word-id-1", "word-id-2"],
  "targetConcept": "subjunctive",
  "reason": "Production score (35%) is below threshold...",
  "confidence": 0.72,
  "algorithm": "linucb",
  "decisionId": "uuid"
}
```

### `POST /ml/router/observe-reward`

```json
// Request
{ "decisionId": "uuid", "userId": "uuid" }

// Response
{ "reward": 2.5, "components": {...}, "observationId": "uuid" }
```

## Running

```bash
# Install dependencies
pip install -r ml/rl_router/requirements.txt

# Start the server
python -m ml.rl_router.scripts.serve --port 8800

# Or with Docker
docker build -f ml/rl_router/Dockerfile -t lingua-rl-router .
docker run -p 8800:8800 --env-file .env.local lingua-rl-router
```

## Environment Variables

| Variable                    | Description               | Default    |
| --------------------------- | ------------------------- | ---------- |
| `RL_ROUTER_HOST`            | Server host               | `0.0.0.0`  |
| `RL_ROUTER_PORT`            | Server port               | `8800`     |
| `RL_ROUTER_WORKERS`         | Uvicorn workers           | `1`        |
| `RL_ROUTER_API_KEY`         | API authentication key    | (none)     |
| `NEXT_PUBLIC_SUPABASE_URL`  | Supabase project URL      | (required) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | (required) |
