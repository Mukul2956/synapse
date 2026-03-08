<div align="center">

# ⬡ Synapse

### Intelligent Content Platform

**One platform. Every stage of content.**

Synapse unifies content ideation, production, analytics, and distribution in one streamlined platform — from trend discovery to multi-modal creation and real-time performance insights.

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/Status-Early_Access-gold)]()

</div>

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Modules](#modules)
  - [Genesis — Ideation & Research](#genesis--ideation--research)
  - [Forge — Multi-Modal Content Studio](#forge--multi-modal-content-studio)
  - [Pulse — Real-Time Analytics](#pulse--real-time-analytics)
  - [Orbit — Distribution & Scheduling](#orbit--distribution--scheduling)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
  - [Forge API](#forge-api)
  - [Genesis API](#genesis-api)
  - [Pulse API](#pulse-api)
  - [Orbit API](#orbit-api)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Team](#team)

---

## Overview

Content teams today juggle dozens of disconnected tools — one for trend research, another for writing, separate dashboards for analytics and scheduling. Context is lost at every handoff.

Synapse solves this by covering the **full content lifecycle** in four integrated modules:

```
  Discover  →  Create  →  Analyze  →  Scale
  (Genesis)    (Forge)    (Pulse)    (Orbit)
```

Each module is powerful on its own. Together, they form a seamless pipeline where information flows forward automatically — a trend becomes a brief, a brief becomes multi-format content, content gets tracked in real time, and distribution is scheduled at optimal times.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Frontend (BFF)                   │
│                   AWS Amplify / Docker                      │
│                                                             │
│   /api/forge/*    /api/genesis/*   /api/pulse/*   /api/orbit/*
│       │                │               │              │     │
└───────┼────────────────┼───────────────┼──────────────┼─────┘
        │                │               │              │
        ▼                ▼               ▼              ▼
   ┌─────────┐    ┌──────────┐    ┌──────────┐   ┌──────────┐
   │  Forge  │    │ Genesis  │    │  Pulse   │   │  Orbit   │
   │ :8000   │    │  :8001   │    │  :8002   │   │  :8003   │
   └─────────┘    └──────────┘    └──────────┘   └──────────┘
        │                │               │              │
        └────────────────┴───────┬───────┴──────────────┘
                                 │
                           ┌───────────┐
                           │ PostgreSQL │
                           └───────────┘
```

- **Four independent microservices**, each with its own deployment and port
- **Next.js acts as a BFF** (Backend for Frontend), proxying all API calls via server-side rewrites
- **Keep-alive instrumentation** pings all services every 5 minutes to prevent Render free-tier cold starts
- **Proxy timeout** set to 5 minutes (3,000,000 ms) for long-running LLM pipelines

### Proxy Rewrite Rules

| Frontend Route | Backend Target |
|---|---|
| `/api/forge/:path*` | `FORGE_BACKEND_URL/api/v1/:path*` |
| `/api/genesis/:path*` | `GENESIS_BACKEND_URL/:path*` |
| `/api/pulse/:path*` | `PULSE_BACKEND_URL/:path*` |
| `/api/orbit/:path*` | `ORBIT_BACKEND_URL/api/v1/:path*` |

---

## Modules

### Genesis — Ideation & Research

> 🟣 *Discover emerging trends before they peak*

Genesis monitors **100K+ posts/hour** across major platforms and surfaces content opportunities with quantified scoring.

**Key Features:**
- **Live trend tracking** — Each trend scored 0–100 with velocity indicators and lifecycle stages (emerging / growing / peak / declining)
- **Content gap analysis** — Identifies underserved topics rated high / med / low
- **AI Brief Generator** — One-click structured brief with target audience, key angles, SEO keywords, and recommended formats
- **Keyword explorer** — Search volume, difficulty, CPC, and search intent
- **Data source monitoring** — Real-time posts/hr and latency per platform feed
- **Send to Forge** — Push a generated brief directly into the content creation pipeline

---

### Forge — Multi-Modal Content Studio

> 🟡 *Turn a single brief into a full campaign*

Forge transforms any input into polished, platform-ready content across **11 output formats** — text, video, audio, and visuals — all brand-consistent and ready in minutes.

**Supported Inputs:**
- Text (up to 500K characters)
- File uploads (images, video, audio, PDF — up to 50MB per file)
- URLs (up to 10, auto-extracted)

**Output Formats:**
Podcast Script · Video Script · Blog Post · Twitter Thread · Instagram Carousel · LinkedIn Article · YouTube Script · Newsletter · Short-Form Script · Presentation · Generic Script

**Key Features:**
- **Multi-provider LLM support** — Auto, Ollama, OpenAI, Anthropic, Gemini with live health indicators
- **4-stage pipeline** — Ingestion → Analysis → Generation → Quality Check with real-time progress
- **Quality scoring** — Pass/fail badge, issue detection, word count, estimated duration
- **Semantic analysis** — Message essence, key topics/entities, sentiment, intent, dominant emotion, tone axes (formality, energy, warmth, humor, authority)
- **Iterative refinement** — "Revise with feedback" for targeted edits or "Fresh take" for full regeneration

---

### Pulse — Real-Time Analytics

> 🟢 *Track every piece of content in real time*

Pulse provides real-time performance analytics, AI-powered improvement suggestions, and competitive intelligence.

**Key Features:**
- **KPI Dashboard** — Total views, avg. engagement, shares, saves with % deltas vs prior period
- **Time range filtering** — 7d / 14d / 30d / 90d with platform and trend direction filters
- **URL Analyzer** — Paste any YouTube or Reddit URL for live metrics, sentiment analysis (VADER NLP), and performance status
- **AI Suggestions** — 3 specific, data-driven improvement tips powered by NVIDIA Qwen (122B parameters)
- **Historical tracking** — View how metrics evolve over time for any analyzed content
- **Discover Trending** — Live trending content from YouTube and Reddit for competitive intelligence
- **Cross-platform charts** — Area chart (views & engagement over time) + bar chart (platform comparison)

**Status Logic:**
| Condition | Status |
|---|---|
| Engagement < 30% below baseline | `underperforming` |
| Engagement > 50% above baseline | `viral_spike` |
| Sentiment score < -0.3 | `negative_sentiment` |
| Otherwise | `on_track` |

---

### Orbit — Distribution & Scheduling

> 🔵 *Publish to every platform from one place*

Orbit handles cross-platform distribution with ML-powered optimal timing and automated scheduling.

**Supported Platforms:** YouTube · LinkedIn · Reddit · Twitter/X · Instagram · TikTok

**Key Features:**
- **Interactive calendar** — Monthly view with color-coded platform dots
- **Smart scheduling** — ML-based optimal posting time predictions with confidence scores and reasoning
- **Content queue** — Manage drafts with status badges (Published / Scheduled / Paused / Draft)
- **OAuth connections** — One-click connect/disconnect per platform
- **Engagement heatmap** — Hour-by-hour audience activity visualization
- **Data ingestion** — Sync audience patterns and performance data per platform for ML model training
- **Trending feeds** — Browse Reddit trending by subreddit and YouTube trending by region/category

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.6 (App Router) |
| UI Library | React 19.2.3 |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS 4.x (dark theme, CSS custom properties) |
| Charts | Recharts 3.7 |
| Icons | Lucide React 0.575 |
| Markdown | react-markdown 10.1 |
| Utilities | clsx + tailwind-merge |
| Font | Inter (next/font/google) |
| AI Models | NVIDIA Qwen 3.5 122B, OpenAI, Anthropic, Gemini, Ollama |
| NLP | VADER sentiment analysis |
| Database | PostgreSQL |
| External APIs | YouTube Data API v3, Reddit public API |
| Deployment | AWS Amplify (frontend) + Render (backend services) |
| Containerization | Docker (multi-stage Node 20 Alpine) |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd synapse/frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your backend URLs (see Environment Variables below)

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Environment Variables

### Backend Service URLs

| Variable | Default | Description |
|---|---|---|
| `FORGE_BACKEND_URL` | `http://localhost:8000` | Forge microservice URL |
| `GENESIS_BACKEND_URL` | `http://localhost:8001` | Genesis microservice URL |
| `PULSE_BACKEND_URL` | `http://localhost:8002` | Pulse microservice URL |
| `ORBIT_BACKEND_URL` | `http://localhost:8003` | Orbit microservice URL |

### Public Client URLs (optional overrides)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_FORGE_API_URL` | `/api/forge` | Forge API route |
| `NEXT_PUBLIC_GENESIS_API_URL` | `/api/genesis` | Genesis API route |
| `NEXT_PUBLIC_PULSE_API_URL` | `/api/pulse` | Pulse API route |
| `NEXT_PUBLIC_ORBIT_API_URL` | `/api/orbit` | Orbit API route |

### Backend Service Environment

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `YOUTUBE_API_KEY` | Yes | Google Cloud API key (YouTube Data API v3) |
| `NVIDIA_API_KEY` | Yes | NVIDIA API key for AI suggestions |
| `NVIDIA_API_URL` | Yes | `https://integrate.api.nvidia.com/v1/chat/completions` |
| `NVIDIA_MODEL` | No | Defaults to `qwen/qwen3.5-122b-a10b` |

---

## API Reference

All endpoints are accessed through the Next.js proxy. The base URL is your frontend domain (e.g., `http://localhost:3000`).

### Forge API

Base path: `/api/forge`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/forge/health` | Service health + provider status |
| `GET` | `/api/forge/providers` | List available LLM providers with health |
| `POST` | `/api/forge/transform` | Transform content into target format |
| `POST` | `/api/forge/regenerate` | Regenerate content with feedback |

#### `POST /api/forge/transform`

Multipart form data request:

| Field | Type | Description |
|---|---|---|
| `text_input` | string | Raw text content (up to 500K chars) |
| `files` | File[] | Uploaded files (up to 50MB each) |
| `urls` | string (JSON array) | URLs to extract content from (max 10) |
| `output_format` | string | Target format (see supported formats above) |
| `output_description` | string | Description of desired output |
| `duration_seconds` | number | Target duration in seconds |
| `additional_instructions` | string | Extra instructions for the LLM |
| `preferred_provider` | string | `ollama` \| `openai` \| `anthropic` \| `gemini` |

**Response:**
```json
{
  "content_id": "string",
  "success": true,
  "generated_script": "# Markdown content...",
  "output_format": "video_script",
  "semantic_summary": {
    "message_essence": "string",
    "key_topics": ["string"],
    "key_entities": ["string"],
    "sentiment": "positive",
    "intent": "inform",
    "dominant_emotion": "enthusiasm",
    "tone_scores": {
      "formality": 0.7,
      "energy": 0.8,
      "warmth": 0.6,
      "humor": 0.2,
      "authority": 0.75
    }
  },
  "quality": {
    "overall_score": 85,
    "word_count": 1200,
    "estimated_minutes": 8.0,
    "issues": []
  },
  "stages": [
    { "name": "ingestion", "status": "complete", "duration": 2.3 }
  ],
  "total_duration_seconds": 45.2
}
```

#### `POST /api/forge/regenerate`

| Field | Type | Description |
|---|---|---|
| `content_id` | string | **Required.** ID from previous transform |
| `feedback` | string | User feedback for revision |
| `preferred_provider` | string | LLM provider override |

---

### Genesis API

Base path: `/api/genesis`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/genesis/stats` | Platform-wide statistics |
| `GET` | `/api/genesis/trends` | Trending topics (with optional `?search=`) |
| `GET` | `/api/genesis/keywords` | Keyword research data |
| `GET` | `/api/genesis/sources` | Data source health/status |
| `POST` | `/api/genesis/brief` | Generate AI content brief |

#### `GET /api/genesis/stats`

```json
{
  "trends_tracked": 2841,
  "opportunities": 47,
  "briefs_generated": 194,
  "data_sources": 12,
  "posts_per_hour": 108420
}
```

#### `GET /api/genesis/trends?search=AI`

```json
{
  "trends": [
    {
      "topic": "AI-Generated Podcasts",
      "score": 87,
      "velocity": "+24%",
      "lifecycle": "emerging",
      "volume": "45K",
      "category": "Technology",
      "sources": ["twitter", "reddit", "youtube"],
      "gap": "high"
    }
  ]
}
```

#### `GET /api/genesis/keywords`

```json
{
  "keywords": [
    {
      "kw": "ai content creation",
      "vol": "14.8K",
      "diff": 42,
      "cpc": "$3.20",
      "intent": "commercial"
    }
  ]
}
```

#### `POST /api/genesis/brief`

**Request:**
```json
{
  "topic": "AI-Generated Podcasts",
  "niche": "technology"
}
```

**Response:**
```json
{
  "topic": "AI-Generated Podcasts",
  "target_audience": "Content creators and marketers",
  "angles": ["Cost comparison vs traditional production", "..."],
  "seo_keywords": ["ai podcast", "automated podcast", "..."],
  "recommended_formats": ["blog_post", "youtube_script", "podcast_script"]
}
```

---

### Pulse API

Base path: `/api/pulse`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/pulse/analytics/summary` | KPI cards with % change |
| `GET` | `/api/pulse/analytics/timeseries` | Daily metrics for charts |
| `GET` | `/api/pulse/analytics/by-platform` | Platform comparison data |
| `GET` | `/api/pulse/analytics/top-content` | Top performing content |
| `GET` | `/api/pulse/analytics/discover-trending` | Live trending from platforms |
| `POST` | `/api/pulse/analyze` | Analyze any YouTube/Reddit URL |
| `POST` | `/api/pulse/suggestions` | AI improvement suggestions |
| `GET` | `/api/pulse/analyze/{content_id}/history` | Historical metric snapshots |
| `GET` | `/api/pulse/health` | Service health check |

#### `POST /api/pulse/analyze`

**Request:**
```json
{ "url": "https://www.youtube.com/watch?v=VIDEO_ID" }
```

Supported: `youtube.com/watch?v=`, `youtu.be/`, `reddit.com/r/*/comments/*`

**Response:**
```json
{
  "content_id": "uuid",
  "platform": "youtube",
  "title": "Video Title",
  "url": "https://...",
  "thumbnail": "https://i.ytimg.com/...",
  "channel": "Channel Name",
  "metrics": {
    "views": 123297,
    "likes": 7200,
    "comments": 1050,
    "engagement_rate": 6.69,
    "sentiment_score": 0.312,
    "sentiment_label": "positive",
    "recorded_at": "2025-07-15T10:00:00Z"
  },
  "status": "on_track",
  "reason": "Content is performing within expected range"
}
```

#### `POST /api/pulse/suggestions`

**Request:**
```json
{ "url": "https://www.youtube.com/watch?v=VIDEO_ID" }
```

> **Note:** Content must be analyzed first via `POST /analyze`.

**Response:**
```json
{
  "content_id": "uuid",
  "platform": "youtube",
  "title": "Video Title",
  "status": "underperforming",
  "reason": "Engagement is 40% below predicted baseline",
  "suggestions": [
    "1. Add timestamps in description to improve retention...",
    "2. Pin a strategic comment within the first hour...",
    "3. Share to relevant subreddits within 48 hours..."
  ]
}
```

#### `GET /api/pulse/analytics/summary?period=14d`

Periods: `7d`, `14d`, `30d`, `90d`

```json
{
  "total_views": 500000,
  "total_views_change": 12.4,
  "avg_engagement": 5.8,
  "avg_engagement_change": -3.1,
  "total_shares": 2400,
  "total_shares_change": 0.0,
  "total_saves": 890,
  "total_saves_change": 8.7
}
```

#### `GET /api/pulse/analytics/timeseries?period=14d`

```json
[
  {
    "date": "2025-07-10",
    "views": 45000,
    "engagement_pct": 6.1,
    "sentiment_score": 0.21,
    "sentiment_label": "positive"
  }
]
```

#### `GET /api/pulse/analytics/by-platform`

```json
[
  {
    "platform": "youtube",
    "posts": 3,
    "total_views": 450000,
    "total_likes": 28000,
    "total_comments": 5200,
    "engagement_rate": 6.5,
    "avg_sentiment": 0.24
  }
]
```

#### `GET /api/pulse/analytics/discover-trending?platform=youtube&limit=5`

```json
[
  {
    "title": "Trending Video Title",
    "platform": "youtube",
    "url": "https://youtube.com/watch?v=...",
    "views": 2400000,
    "engagement_rate": 7.2,
    "published_at": "2025-07-14T00:00:00Z"
  }
]
```

#### `GET /api/pulse/analyze/{content_id}/history`

```json
{
  "content_id": "uuid",
  "title": "Video Title",
  "platform": "youtube",
  "snapshots": [
    {
      "views": 120000,
      "likes": 6800,
      "comments": 900,
      "engagement_rate": 6.42,
      "sentiment_score": 0.28,
      "sentiment_label": "positive",
      "recorded_at": "2025-07-14T09:00:00Z"
    }
  ]
}
```

---

### Orbit API

Base path: `/api/orbit`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/orbit/analytics/performance/{user_id}` | Performance metrics |
| `GET` | `/api/orbit/queue/user/{user_id}` | User's content queue |
| `GET` | `/api/orbit/platforms/status/{user_id}` | Connected platforms |
| `GET` | `/api/orbit/content/user/{user_id}` | User drafts |
| `GET` | `/api/orbit/analytics/best-times/{user_id}` | ML optimal posting times |
| `GET` | `/api/orbit/analytics/heatmap/{user_id}` | Engagement heatmap |
| `POST` | `/api/orbit/content/` | Create a content draft |
| `POST` | `/api/orbit/content/{id}/queue` | Queue content for publishing |
| `GET` | `/api/orbit/platforms/oauth-url/{platform}` | Get OAuth URL |
| `DELETE` | `/api/orbit/platforms/{user_id}/{platform}` | Disconnect platform |
| `POST` | `/api/orbit/ingest/{user_id}/{platform}` | Trigger data ingestion |
| `GET` | `/api/orbit/ingest/status/{user_id}` | Ingestion/ML readiness status |
| `GET` | `/api/orbit/reddit/trending` | Reddit trending posts |
| `GET` | `/api/orbit/youtube/trending` | YouTube trending videos |
| `GET` | `/api/orbit/youtube/search` | Search YouTube |

#### `POST /api/orbit/content/`

**Request:**
```json
{
  "user_id": "00000000-0000-0000-0000-000000000001",
  "title": "Post Title",
  "body": "Post content...",
  "content_type": "text",
  "is_evergreen": true,
  "is_time_sensitive": false
}
```

Content types: `text` | `thread` | `article` | `image` | `carousel` | `video` | `email`

#### `POST /api/orbit/content/{id}/queue`

**Request:**
```json
{
  "platforms": ["linkedin", "twitter"],
  "scheduled_time": null
}
```

**Response:**
```json
{
  "queue_id": "string",
  "optimal_publish_time": "2025-07-15T10:30:00Z"
}
```

#### `GET /api/orbit/analytics/best-times/{user_id}`

```json
[
  {
    "platform": "linkedin",
    "best_time": "Tuesday 10:30 AM",
    "confidence": 0.87,
    "model": "gradient_boosting",
    "best_slot_utc": "2025-07-15T10:30:00Z",
    "avg_engagement": 8.2,
    "overall_engagement": 6.1
  }
]
```

#### `GET /api/orbit/analytics/heatmap/{user_id}?platform=linkedin`

```json
[
  {
    "hour": 10,
    "day_of_week": 2,
    "engagement_rate": 8.5,
    "reach": 12400
  }
]
```

#### `GET /api/orbit/reddit/trending?subreddit=technology&sort=hot&limit=10`

#### `GET /api/orbit/youtube/trending?regionCode=US&categoryId=28`

#### `GET /api/orbit/youtube/search?q=ai+content`

---

## Deployment

### AWS Amplify (Frontend)

The project includes an `amplify.yml` build spec at the repo root:

```yaml
# Build: cd frontend && npm ci && npm run build
# Artifacts: frontend/.next/**/*
# Cache: frontend/node_modules/**/*
```

### Docker

```bash
cd frontend
docker build -t synapse-frontend .
docker run -p 3000:3000 \
  -e FORGE_BACKEND_URL=https://your-forge.onrender.com \
  -e GENESIS_BACKEND_URL=https://your-genesis.onrender.com \
  -e PULSE_BACKEND_URL=https://your-pulse.onrender.com \
  -e ORBIT_BACKEND_URL=https://your-orbit.onrender.com \
  synapse-frontend
```

Multi-stage build using Node 20 Alpine for minimal image size.

### Backend Services (Render)

Each microservice is independently deployed on Render. The frontend's instrumentation layer pings all 4 health endpoints every 5 minutes to prevent free-tier cold starts.

---

## Project Structure

```
synapse/
├── amplify.yml                     # AWS Amplify build config
└── frontend/
    ├── Dockerfile                  # Multi-stage Docker build
    ├── next.config.ts              # Proxy rewrites + Turbopack config
    ├── package.json
    ├── tsconfig.json
    ├── public/                     # Static assets
    └── src/
        ├── instrumentation.ts      # Keep-alive pinger for backend services
        ├── app/
        │   ├── globals.css         # Tailwind + design tokens
        │   ├── layout.tsx          # Root layout (metadata, fonts)
        │   ├── page.tsx            # Landing page
        │   └── dashboard/
        │       ├── layout.tsx      # Dashboard shell (sidebar + navbar)
        │       ├── page.tsx        # Dashboard overview
        │       ├── forge/          # Content creation module
        │       │   ├── page.tsx
        │       │   ├── ConfigPanel.tsx
        │       │   ├── InputSources.tsx
        │       │   ├── OutputFormatGrid.tsx
        │       │   ├── PipelineProgress.tsx
        │       │   ├── RegenerateCard.tsx
        │       │   ├── ResultTabs.tsx
        │       │   ├── ScriptViewer.tsx
        │       │   └── constants.ts
        │       ├── genesis/        # Ideation & research module
        │       ├── orbit/          # Distribution & scheduling module
        │       ├── pulse/          # Analytics module
        │       └── settings/       # Account & team settings
        ├── components/
        │   ├── KeepAlive.tsx       # Client-side keep-alive component
        │   ├── layout/
        │   │   ├── Navbar.tsx      # Top navigation bar
        │   │   └── Sidebar.tsx     # Dashboard sidebar
        │   └── ui/
        │       ├── Badge.tsx       # 8-variant badge component
        │       ├── Button.tsx      # 4-variant button component
        │       └── Card.tsx        # Configurable card component
        └── lib/
            ├── api.ts              # Shared API utilities
            ├── forge-api.ts        # Forge service client
            ├── genesis-api.ts      # Genesis service client
            ├── orbit-api.ts        # Orbit service client
            ├── pulse-api.ts        # Pulse service client
            └── utils.ts            # cn() utility
```

---

## Team

| Name | Role |
|---|---|
| **Mukul Singh** | Product & Content Strategy |
| **Sayantan Mandal** | Platform Architecture & Backend |
| **Praneeth Yeddu** | Frontend Engineering & UX |
| **Dibya Debashish Bhoi** | Data Pipelines & Content Engineering |

---

<div align="center">

**Content that keeps up with the world.**

*Synapse — Now in Early Access*

</div>
