# ORBIT — Intelligent Distribution & Scheduling Nexus

> Part of the **SYNAPSE** AI-Powered Content Intelligence Platform  
> Built for hackathon. ORBIT is the 🔵 distribution pillar.

---

## What ORBIT does

| Feature | Description |
|---------|-------------|
| **Adaptive Timing Engine** | Uses Facebook Prophet + audience pattern data to predict the optimal posting slot per user × platform |
| **Content Queue Intelligence** | Priority queue with relevance decay; time-sensitive content floats, evergreen sinks slowly |
| **Cross-Platform Orchestrator** | Coordinates sequential publishing to Twitter, Instagram, LinkedIn, Facebook, YouTube with strategic delays |
| **Algorithm Monitor** | Z-score + Welch's t-test anomaly detection; flags when a platform likely changed its algorithm |
| **Repurposing Engine** | Scores evergreen content and automatically re-queues it after a configurable interval |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | FastAPI 0.104 + Uvicorn |
| Task Queue | Celery 5 + Redis |
| Scheduling | APScheduler / Celery Beat |
| Database | PostgreSQL 15 + TimescaleDB (time-series) |
| ML | Prophet (timing), LightGBM (priority), Scikit-learn (patterns) |
| Platform SDKs | Tweepy v4, Facebook Graph API, LinkedIn API v2, YouTube Data API v3 |
| Containerisation | Docker + Docker Compose |

---

## Project Structure

```
orbit/
├── app/
│   ├── main.py                # FastAPI app
│   ├── config.py              # Pydantic settings
│   ├── database.py            # Async SQLAlchemy engine
│   ├── models/                # SQLAlchemy ORM models
│   ├── schemas/               # Pydantic request/response schemas
│   ├── services/
│   │   ├── timing_engine.py   # Prophet-based optimal time predictor
│   │   ├── queue_manager.py   # Queue CRUD + decay
│   │   ├── orchestrator.py    # Cross-platform publish workflow
│   │   ├── algorithm_monitor.py # Platform change detector
│   │   └── repurposing_engine.py # Evergreen tracker
│   ├── ml/
│   │   ├── priority_calculator.py # LightGBM priority scorer
│   │   └── pattern_analyzer.py    # Audience heatmap builder
│   ├── integrations/          # Platform publisher adapters
│   ├── tasks/                 # Celery tasks (scheduler, publisher, monitor)
│   └── api/                   # REST route handlers
├── alembic/                   # DB migrations
├── tests/                     # pytest test suite
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── .env.example
```

---

## Quick Start

### 1. Copy and fill `.env`

```bash
cp .env.example .env
# Then edit .env with your platform API keys
```

### 2. Start infrastructure

```bash
docker-compose up -d postgres redis
```

### 3. Set up Python environment

```bash
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

### 4. Run DB migrations

```bash
alembic upgrade head
```

### 5. Start the API server

```bash
uvicorn app.main:app --reload --port 8000
```

### 6. Start Celery workers (separate terminal)

```bash
celery -A app.tasks worker --loglevel=info -Q scheduler,publisher,monitor
celery -A app.tasks beat   --loglevel=info   # periodic tasks
```

### 7. Open the docs

- Swagger UI → http://localhost:8000/docs  
- ReDoc      → http://localhost:8000/redoc

---

## API Reference (key endpoints)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/queue/` | Add content to distribution queue |
| `GET`  | `/api/v1/queue/{id}` | Get queue entry status |
| `GET`  | `/api/v1/queue/user/{user_id}` | List all entries for a user |
| `DELETE` | `/api/v1/queue/{id}` | Cancel a pending entry |
| `POST` | `/api/v1/queue/{id}/approve` | Approve content for publishing |
| `GET`  | `/api/v1/schedule/optimal-time` | Get ML-predicted best posting time |
| `GET`  | `/api/v1/schedule/top-slots` | Top-5 ranked posting slots |
| `POST` | `/api/v1/schedule/publish-now/{id}` | Immediately publish |
| `POST` | `/api/v1/schedule/publish-async/{id}` | Enqueue via Celery |
| `GET`  | `/api/v1/analytics/performance/{user_id}` | Performance summary |
| `GET`  | `/api/v1/analytics/heatmap/{user_id}` | Audience engagement heatmap |
| `GET`  | `/api/v1/analytics/algorithm-changes/{platform}` | Algorithm change log |

---

## Running Tests

```bash
pytest -v
```

---

## Data ORBIT needs from other services

| Data | Source service | How it arrives |
|------|---------------|----------------|
| `content_id` + content payload | **FORGE** | REST call / shared Content DNA |
| `user_id` | Auth / SYNAPSE gateway | JWT token |
| Platform OAuth tokens | User onboarding flow | Stored in `platform_configs` table |
| Historical engagement data | **PULSE** | Populated into `audience_patterns` + `platform_performance` tables |
| Algorithm recommendations | **GENESIS** | Informs `PLATFORM_DEFAULTS` override |

---

## Integration with SYNAPSE Pillars

```
FORGE  ──► ORBIT ──► publish ──► PULSE (analytics feedback)
                  │
                  └──► GENESIS (strategy feedback)
```

ORBIT sits between FORGE (content creation) and PULSE (analytics).  
Feed it `content_id` + `user_id` + `platforms[]` and it handles everything else.
