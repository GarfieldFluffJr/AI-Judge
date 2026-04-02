# AI Judge Platform

A web app that lets users upload annotation submissions, configure AI judges with custom rubrics, run evaluations via real LLM APIs (OpenAI, Anthropic, Gemini), and view results with filters and statistics.

## Quick Start

### Prerequisites

- Node.js 20+
- A Firebase project (free Spark plan works for Firestore; Blaze required for Cloud Functions)
- API key(s) for at least one LLM provider

### Setup

```bash
# Install dependencies
cd frontend && npm install
cd ../functions && npm install

# Configure Firebase
# 1. Create a project at https://console.firebase.google.com
# 2. Enable Firestore in the Firebase console
# 3. Copy your web app config into frontend/.env.local:
cp frontend/.env.local.example frontend/.env.local
# Edit the values with your Firebase project config
```

### Development (with emulators)

```bash
# Terminal 1: Start Firebase emulators
firebase emulators:start

# Terminal 2: Start frontend dev server
cd frontend && npm run dev
```

### Development (with live Firebase)

```bash
# Deploy Cloud Functions (requires Blaze plan)
cd functions && npm run deploy

# Start frontend pointing at live Firebase
cd frontend && npm run dev
```

### Production Build

```bash
cd frontend && npm run build
firebase deploy
```

## Architecture

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 19 + TypeScript + Vite | Modern, fast, type-safe |
| UI | shadcn/ui + Tailwind CSS v4 | Composable components, no runtime overhead |
| Backend | Firebase (Firestore + Cloud Functions v2) | Managed, serverless, real-time capable |
| LLM Integration | OpenAI, Anthropic, Gemini SDKs | Direct SDK calls, no abstraction layer overhead |
| State | TanStack Query | Server-state caching, automatic refetch |
| Routing | React Router v7 | Declarative, lazy-loaded routes |

### Data Flow

```
JSON Upload → Parse & group by queueId → Firestore (queues/submissions/questions)
                                              ↓
                              Assign judges to queues
                                              ↓
                         "Run AI Judges" → Cloud Function
                                              ↓
                    For each (judge × question): call LLM API
                                              ↓
                        Parse verdict → Store evaluation in Firestore
                                              ↓
                          Results page ← Query evaluations with filters
```

### Firestore Schema

- `queues/{queueId}` — name, submission/question counts
- `queues/{queueId}/submissions/{subId}` — labelingTaskId, createdAt
- `queues/{queueId}/submissions/{subId}/questions/{qId}` — questionType, questionText, answer object
- `judges/{judgeId}` — name, systemPrompt, targetModel (e.g. `openai/gpt-4o`), active flag
- `assignments/{id}` — judgeId, queueId, questionId (null = all questions)
- `evaluations/{id}` — verdict, reasoning, status, denormalized judge/question info
- `apiKeys/default` — per-provider API keys

## Design Decisions

### Why direct Firestore writes instead of Cloud Functions for upload?

The upload operation is straightforward batch writes with no server-side logic needed. Using `writeBatch` directly from the client avoids a round-trip through Cloud Functions and keeps the code simpler. The Cloud Function is reserved for the evaluation runner where we need server-side secrets (API keys) and long-running LLM calls.

### Why hand-rolled SVG charts instead of Recharts?

Recharts added 380KB to the results page bundle for two simple charts (a donut and a bar chart). Custom SVG components achieve the same visualization in ~2KB with CSS transitions for animation. The trade-off is less interactivity (no hover tooltips on individual segments), which is acceptable for a summary view.

### Why client-side multi-select filtering?

Firestore doesn't support `IN` queries across multiple fields simultaneously. Rather than denormalize data further or use complex composite indexes, evaluations are fetched with a single `orderBy(createdAt)` query (optionally filtered by queueId) and multi-select filters (judge, question, verdict) are applied client-side. This is fine for the expected data volumes (hundreds to low thousands of evaluations).

### Why `provider/model` string format?

Storing the target model as `"openai/gpt-4o"` instead of separate `provider` + `model` fields keeps the judge definition simple and makes the provider registry a straightforward string split. The trade-off is parsing on every evaluation, which is negligible.

### Why no authentication?

This is a single-user take-home project. Adding Firebase Auth would add complexity without demonstrating relevant skills. The Firestore rules are open (`allow read, write: if true`). In production, you'd add auth and scope data access per user/team.

### Scope cuts

- **No file attachment forwarding**: Would require Firebase Storage + multimodal API calls. Deferred to keep scope focused.
- **No per-question judge assignment UI**: Judges are assigned at the queue level. The data model supports per-question assignment, but the UI only exposes queue-level for simplicity.
- **No real-time evaluation progress**: The UI polls on completion rather than using Firestore `onSnapshot` listeners. Would be a small addition for a smoother UX.

## Project Structure

```
├── frontend/                  # React + Vite app
│   └── src/
│       ├── components/
│       │   ├── ui/            # shadcn/ui components
│       │   ├── layout/        # AppShell, Sidebar
│       │   └── charts/        # Hand-rolled SVG DonutChart, BarChart
│       ├── hooks/             # TanStack Query hooks per domain
│       ├── lib/               # Firebase init, Firestore helpers, constants
│       ├── pages/             # Route page components (lazy-loaded)
│       └── types/             # TypeScript interfaces
├── functions/                 # Firebase Cloud Functions
│   └── src/
│       ├── evaluations/       # Batch runner, prompt builder
│       └── providers/         # OpenAI, Anthropic, Gemini adapters + registry
├── firebase.json              # Emulator + hosting + functions config
├── firestore.rules            # Security rules (open for demo)
└── test_input.json            # Sample input matching real format
```
