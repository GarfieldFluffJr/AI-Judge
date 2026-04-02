# AI Judge Platform

A web app that lets users upload annotation submissions, configure AI judges with custom rubrics, run evaluations via real LLM APIs (OpenAI, Anthropic, Gemini), and view results with filters and statistics.

## Quick Start

### Prerequisites

- Node.js 20+
- A Firebase project (free Spark plan — no paid plan required)
- API key(s) for at least one LLM provider (OpenAI, Anthropic, or Google Gemini)

### Setup

```bash
# Install frontend dependencies
cd frontend && npm install

# Create your environment config
cp .env.template .env.local
# Edit .env.local with your Firebase project config
# (Find these in Firebase Console → Project Settings → General → Web App)
```

### Running

```bash
cd frontend && npm run dev
```

Then in the app:
1. **Settings** — paste your LLM provider API key(s)
2. **Upload** — upload `test_input.json` (included in repo root)
3. **Judges** — create a judge with a name, model, and rubric prompt
4. **Queues** — click a queue → Assign Judge → Run AI Judges
5. **Results** — view evaluations with filters and charts

### Production Build

```bash
cd frontend && npm run build
# Deploy dist/ to any static hosting (Firebase Hosting, Vercel, Netlify, etc.)
```

## Architecture

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 19 + TypeScript + Vite | Modern, fast, type-safe |
| UI | shadcn/ui + Tailwind CSS v4 | Composable components, no runtime overhead |
| Backend | Firebase Firestore (free Spark plan) | Managed NoSQL, no server to run |
| LLM Integration | Direct `fetch()` to OpenAI, Anthropic, Gemini APIs | Zero SDK bloat, runs in the browser |
| State | TanStack Query | Server-state caching, automatic refetch |
| Routing | React Router v7 | Declarative, lazy-loaded routes |

### Data Flow

```
JSON Upload → Parse & group by queueId → Firestore (queues/submissions/questions)
                                              ↓
                              Assign judges to queues
                                              ↓
                "Run AI Judges" → browser calls LLM APIs directly
                                              ↓
                    For each (judge × question): call LLM, parse verdict
                                              ↓
                        Store evaluation in Firestore
                                              ↓
                          Results page ← Query evaluations with filters
```

All LLM calls happen client-side using the user's own API keys. No Cloud Functions or paid Firebase plan required.

### Firestore Schema

- `queues/{queueId}` — name, submission/question counts
- `queues/{queueId}/submissions/{subId}` — labelingTaskId, createdAt
- `queues/{queueId}/submissions/{subId}/questions/{qId}` — questionType, questionText, answer object
- `judges/{judgeId}` — name, systemPrompt, targetModel (e.g. `openai/gpt-4o`), active flag
- `assignments/{id}` — judgeId, queueId, questionId (null = all questions)
- `evaluations/{id}` — verdict, reasoning, status, denormalized judge/question info
- `apiKeys/default` — per-provider API keys entered by the user

## Design Decisions

### Why client-side LLM calls instead of Cloud Functions?

Cloud Functions require the Firebase Blaze (paid) plan. Since users provide their own API keys and this is a single-user demo app, calling LLM APIs directly from the browser via `fetch()` is simpler and free. The trade-off is that API keys are visible in the browser's network tab, which is acceptable when the user is providing their own keys. In production, you'd proxy through a backend.

### Why hand-rolled SVG charts instead of Recharts?

Recharts added 380KB to the results page bundle for two simple charts (a donut and a bar chart). Custom SVG components achieve the same visualization in ~2KB with CSS transitions for animation. The trade-off is less interactivity (no hover tooltips on individual segments), which is acceptable for a summary view.

### Why client-side multi-select filtering?

Firestore doesn't support `IN` queries across multiple fields simultaneously. Rather than denormalize data further or use complex composite indexes, evaluations are fetched with a single `orderBy(createdAt)` query (optionally filtered by queueId) and multi-select filters (judge, question, verdict) are applied client-side. This is fine for the expected data volumes (hundreds to low thousands of evaluations).

### Why `provider/model` string format?

Storing the target model as `"openai/gpt-4o"` instead of separate `provider` + `model` fields keeps the judge definition simple and makes the provider routing a straightforward string split. The trade-off is parsing on every evaluation, which is negligible.

### Why no authentication?

This is a single-user take-home project. Adding Firebase Auth would add complexity without demonstrating relevant skills. The Firestore rules are open (`allow read, write: if true`). In production, you'd add auth and scope data access per user/team.

### Scope cuts

- **No file attachment forwarding**: Would require Firebase Storage + multimodal API calls. Deferred to keep scope focused.
- **No per-question judge assignment UI**: Judges are assigned at the queue level. The data model supports per-question assignment, but the UI only exposes queue-level for simplicity.
- **No real-time evaluation progress**: Evaluations update on completion rather than streaming progress via Firestore `onSnapshot` listeners. Would be a small addition for a smoother UX.

## Project Structure

```
├── frontend/                  # React + Vite app
│   ├── .env.template          # Template for environment config
│   └── src/
│       ├── components/
│       │   ├── ui/            # shadcn/ui components
│       │   ├── layout/        # AppShell, Sidebar
│       │   └── charts/        # Hand-rolled SVG DonutChart, BarChart
│       ├── hooks/             # TanStack Query hooks per domain
│       ├── lib/               # Firebase init, Firestore helpers, LLM client, constants
│       ├── pages/             # Route page components (lazy-loaded)
│       └── types/             # TypeScript interfaces
├── functions/                 # Firebase Cloud Functions (optional, not required)
├── firebase.json              # Firebase project config
├── firestore.rules            # Security rules (open for demo)
└── test_input.json            # Sample input matching real format
```
