# LLM Feedback Generator (System 7)

LLM-powered micro-explanation system triggered on repeated errors. Detects error
patterns and generates personalized explanations using only the learner's known
vocabulary.

## Quick Start

```bash
# Install dependencies
pip install -r ml/feedback_generator/requirements.txt

# Set environment variables (already in .env / .env.local)
# GOOGLE_API_KEY=...  (or OPENAI_API_KEY, or configure Ollama)

# Start the server
python -m ml.feedback_generator.scripts.serve --port 8500

# Health check
curl http://localhost:8500/ml/feedback/health
```

## Architecture

```
ml/feedback_generator/
├── config.py                  # Configuration (frozen dataclasses)
├── api/
│   ├── app.py                 # FastAPI factory + lifespan
│   ├── routes.py              # POST /explain, POST /grammar-examples, GET /health
│   └── schemas.py             # Pydantic v2 request/response models
├── data/
│   └── supabase_client.py     # Supabase data access layer
├── engine/
│   ├── generator.py           # Main orchestrator (ties everything together)
│   ├── llm_client.py          # Multi-provider LLM client (Gemini/OpenAI/Ollama)
│   ├── pattern_detector.py    # Error pattern analysis
│   ├── prompt_engine.py       # Parameterized prompt templates + parsers
│   └── trigger_checker.py     # Trigger condition evaluation
├── scripts/
│   └── serve.py               # CLI entry point
├── tests/
│   └── test_pattern_detector.py
├── Dockerfile
├── requirements.txt
└── README.md
```

## API Endpoints

### `POST /ml/feedback/explain`

Generate a personalized micro-explanation for a word the learner keeps getting wrong.

**Request:**

```json
{
  "userId": "uuid",
  "wordId": "uuid",
  "sessionId": "uuid",
  "force": false
}
```

**Response:**

```json
{
  "explanation": "Think of 'manger' like 'mange' which you already know...",
  "exampleSentence": "Je mange une pomme le matin.",
  "patternDetected": "production_gap",
  "patternDescription": "The learner recognises this word but struggles to produce it...",
  "patternConfidence": 0.85,
  "triggerReason": "session_repeat_errors",
  "triggered": true,
  "cached": false,
  "llmProvider": "google",
  "llmModel": "gemini-2.0-flash",
  "latencyMs": 1200
}
```

### `POST /ml/feedback/grammar-examples`

Generate 3 example sentences demonstrating a grammar concept using only known words.

**Request:**

```json
{
  "userId": "uuid",
  "grammarConceptTag": "passé_composé",
  "knownWordIds": ["uuid1", "uuid2"]
}
```

**Response:**

```json
{
  "sentences": [
    "J'ai mangé une pomme. (I ate an apple.)",
    "Elle a regardé le film hier soir. (She watched the movie last night.)",
    "Nous avons parlé avec notre ami. (We spoke with our friend.)"
  ],
  "grammarConcept": "passé_composé",
  "llmProvider": "google",
  "llmModel": "gemini-2.0-flash",
  "latencyMs": 1500
}
```

## Trigger Conditions

Feedback fires when either:

1. **Session repeat errors**: Same word wrong 2+ times in one session
2. **High exposure, low recognition**: `exposure_count > 5` AND `recognition_score < 0.4`

## Error Pattern Detection

Before calling the LLM, the system analyses `module_review_history` and `interaction_events`:

| Pattern              | Detection                                     | Meaning                       |
| -------------------- | --------------------------------------------- | ----------------------------- |
| `production_gap`     | Right on MC/reading, wrong on typing/speaking | Knows meaning, can't produce  |
| `contextualization`  | Right in drills, wrong in stories             | Can't use word in context     |
| `slow_recognition`   | Mostly correct but slow (>5s avg)             | Recognises but not automatic  |
| `general_difficulty` | Wrong across all modules                      | Fundamental comprehension gap |
| `early_learning`     | <3 total interactions                         | Not enough data yet           |

## LLM Providers

Configured via `FEEDBACK_LLM_PROVIDER` env var:

| Provider           | Env Vars          | Default Model      |
| ------------------ | ----------------- | ------------------ |
| `google` (default) | `GOOGLE_API_KEY`  | `gemini-2.0-flash` |
| `openai`           | `OPENAI_API_KEY`  | `gpt-4o-mini`      |
| `ollama`           | `OLLAMA_BASE_URL` | `llama3.1:8b`      |

## Environment Variables

| Variable                     | Default                  | Description                           |
| ---------------------------- | ------------------------ | ------------------------------------- |
| `FEEDBACK_GENERATOR_PORT`    | `8500`                   | Server port                           |
| `FEEDBACK_GENERATOR_HOST`    | `0.0.0.0`                | Server host                           |
| `FEEDBACK_GENERATOR_API_KEY` | ``                       | Shared secret (empty = skip auth)     |
| `FEEDBACK_LLM_PROVIDER`      | `google`                 | LLM provider                          |
| `FEEDBACK_GOOGLE_MODEL`      | `gemini-2.0-flash`       | Gemini model                          |
| `FEEDBACK_OPENAI_MODEL`      | `gpt-4o-mini`            | OpenAI model                          |
| `FEEDBACK_OLLAMA_MODEL`      | `llama3.1:8b`            | Ollama model                          |
| `GOOGLE_API_KEY`             | —                        | Google API key (shared with main app) |
| `OPENAI_API_KEY`             | —                        | OpenAI API key                        |
| `OLLAMA_BASE_URL`            | `http://localhost:11434` | Ollama server URL                     |

## Port Assignment

| Service                | Port     |
| ---------------------- | -------- |
| DKT                    | 8100     |
| Cognitive Load         | 8200     |
| Story Word Selector    | 8300     |
| Complexity Predictor   | 8400     |
| **Feedback Generator** | **8500** |
