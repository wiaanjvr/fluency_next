# Story Word Selector — Adaptive ML-Informed Word Selection

A standalone Python microservice (port **8300**) that replaces the naive "words where dueDate ≤ today" selector with an ML-informed ranker for story generation.

## Architecture

```
┌───────────────────────────────────────────────┐
│ Next.js Backend                               │
│   POST /api/ml/story/select-words  ──────────►│
└──────────────────────────┬────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────┐
│ Story Word Selector (:8300)                   │
│ ┌───────────────┐  ┌────────────────────────┐ │
│ │ Scoring Engine │  │ Thematic Embeddings    │ │
│ │ storyScore()   │  │ 16-dim topic vectors   │ │
│ └───────┬───────┘  └──────────┬─────────────┘ │
│         │                     │               │
│ ┌───────▼─────────────────────▼───────────┐   │
│ │ Word Selector                           │   │
│ │ • Partition: due vs known pool          │   │
│ │ • Score due words (5 signals)           │   │
│ │ • Enforce 95% known constraint          │   │
│ │ • Fill known slots by thematic relevance│   │
│ └─────────────┬───────────────────────────┘   │
│               │                               │
│     ┌─────────┴──────────┐                    │
│     ▼                    ▼                    │
│  Supabase            DKT (:8100)              │
│  (user_words,        (p_forget_48h)           │
│   sessions,                                   │
│   preferences)                                │
└───────────────────────────────────────────────┘
```

## Scoring Function

```
storyScore(word) =
    (0.4 × p_forget_48h)           # DKT forgetting risk — prioritize at-risk words
  + (0.2 × recencyPenalty)          # penalize words seen in last 2 sessions
  + (0.2 × productionGap)           # gap between recognitionScore and productionScore
  + (0.1 × moduleVarietyBonus)      # bonus if word hasn't appeared in story mode recently
  + (0.1 × thematicRelevanceScore)  # match to user's topic preference embedding
```

### Signal Details

| Signal                   | Range | Source                                         | Fallback                                  |
| ------------------------ | ----- | ---------------------------------------------- | ----------------------------------------- |
| `p_forget_48h`           | [0,1] | DKT service (:8100)                            | Heuristic: `clamp(days_overdue/14, 0, 1)` |
| `recencyPenalty`         | [0,1] | session_summaries.words_reviewed_ids           | 1.0 (no penalty)                          |
| `productionGap`          | [0,1] | ease_factor vs production_score                | Pure SRS delta                            |
| `moduleVarietyBonus`     | {0,1} | interaction_events WHERE module='story_engine' | 1.0 (bonus)                               |
| `thematicRelevanceScore` | [0,1] | user_topic_preferences × word tags             | 0.5 (neutral)                             |

## 95% Known Word Constraint

1. Score and rank all due/new words
2. Select top N where N = max(1, floor(targetWordCount × 0.05))
3. Fill remaining slots from known pool, ranked by thematic relevance + variety
4. Due words never exceed 5% of total (hard cap: 10% at complexity=5)

## API Endpoints

### `POST /ml/story/select-words`

Main entry point — called before each story generation.

```json
// Request
{
  "userId": "uuid",
  "targetWordCount": 60,
  "storyComplexityLevel": 2
}

// Response
{
  "dueWords": ["word-id-1", "word-id-2", "word-id-3"],
  "knownFillWords": ["word-id-4", "word-id-5", ...],
  "thematicBias": ["travel", "food_cooking", "culture_arts"],
  "debug": {
    "totalUserWords": 450,
    "duePoolSize": 35,
    "knownPoolSize": 380,
    "dktCoverage": 300,
    "maxDueAllowed": 3,
    "selectedDueCount": 3,
    "selectedKnownCount": 57,
    "knownPercentage": 95.0
  }
}
```

### `POST /ml/story/init-preferences`

Called at signup when user selects 3 topic interests.

```json
// Request
{ "userId": "uuid", "selectedTopics": ["travel", "food_cooking", "culture_arts"] }

// Response
{ "status": "ok", "preferenceVector": [0.12, ...], "selectedTopics": [...] }
```

### `POST /ml/story/update-preferences`

Called after each story session with engagement data.

```json
// Request
{
  "userId": "uuid",
  "storyTopicTags": ["travel"],
  "timeOnSegmentMs": 45000,
  "storyId": "uuid"
}

// Response
{ "status": "ok" }
```

### `GET /ml/story/topics`

Returns all available topic tags for the signup selector UI.

### `GET /ml/story/health`

Health check — also probes the DKT service.

## Database Tables

Added in migration `20260222240000_story_word_selector.sql`:

- **`user_topic_preferences`** — 16-dim preference vector, selected topics, engagement counters
- **`story_segment_engagement`** — per-story time-on-segment for preference updates
- **GIN index on `user_words.tags`** — efficient topic-based word filtering

## Quick Start

```bash
# Install dependencies
pip install -r ml/story_word_selector/requirements.txt

# Run the service (dev mode with auto-reload)
python -m ml.story_word_selector.scripts.serve --reload

# Run tests
pytest ml/story_word_selector/tests/ -v

# Docker
docker build -f ml/story_word_selector/Dockerfile -t lingua-story-selector .
docker run -p 8300:8300 --env-file .env.local lingua-story-selector
```

## Environment Variables

| Variable                    | Default                 | Description               |
| --------------------------- | ----------------------- | ------------------------- |
| `STORY_SELECTOR_HOST`       | `0.0.0.0`               | Bind host                 |
| `STORY_SELECTOR_PORT`       | `8300`                  | Bind port                 |
| `STORY_SELECTOR_API_KEY`    | (empty)                 | Shared secret for auth    |
| `DKT_BASE_URL`              | `http://localhost:8100` | DKT service URL           |
| `DKT_API_KEY`               | (empty)                 | DKT service API key       |
| `NEXT_PUBLIC_SUPABASE_URL`  | —                       | Supabase project URL      |
| `SUPABASE_SERVICE_ROLE_KEY` | —                       | Supabase service role key |

## Topic Taxonomy (15 topics)

| Tag                    | Label                  |
| ---------------------- | ---------------------- |
| `daily_life`           | Daily Life & Routines  |
| `food_cooking`         | Food & Cooking         |
| `travel`               | Travel & Geography     |
| `culture_arts`         | Culture & Arts         |
| `nature_environment`   | Nature & Environment   |
| `sports_health`        | Sports & Health        |
| `entertainment`        | Entertainment & Media  |
| `family_relationships` | Family & Relationships |
| `work_career`          | Work & Career          |
| `technology`           | Technology & Science   |
| `history`              | History & Society      |
| `animals`              | Animals & Pets         |
| `shopping_fashion`     | Shopping & Fashion     |
| `education`            | Education & Learning   |
| `emotions_personality` | Emotions & Personality |
