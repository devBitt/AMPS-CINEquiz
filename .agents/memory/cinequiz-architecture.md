---
name: CineQuiz Live Architecture
description: Key technical decisions for the CineQuiz Live college-fest competition platform
---

## Stack

- **Frontend**: React + Vite, Zustand, Socket.IO client, Framer Motion, Tailwind CSS, Wouter router
- **Backend**: Express 5 + Socket.IO on single HTTP server (`http.createServer(app)`)
- **Database**: Node.js 24 built-in `node:sqlite` (`DatabaseSync` from `node:sqlite`) — no Python/native build required
- **Auth**: JWT (`jsonwebtoken`) with `JWT_SECRET` env var fallback
- **Artifact slug**: `cinequiz` at root path `/`

## Key Decisions

**SQLite approach**: `better-sqlite3` fails because Python is not available for native builds. Use Node.js 24 built-in `node:sqlite` (`DatabaseSync`) instead — no npm install needed, stable in Node 24.

**Why:** `const { DatabaseSync } = require("node:sqlite")` via `createRequire` pattern in db.ts; esbuild's banner provides `globalThis.require`.

**Socket.IO on same server**: `io = initializeSocketIO(httpServer)` where `httpServer = createServer(app)`. The artifact.toml has `paths = ["/api", "/socket.io"]` to proxy WebSocket traffic.

**io available to routes**: `app.set("io", io)` in index.ts, accessed via `req.app.get("io")` in route handlers.

**Elimination algorithm**: Adaptive Tiered Elimination — rounds 1-4 keep top 40%/30%/25%/2 participants respectively, sorted by correctness then response time then server-received timestamp.

**Default credentials**: admin / cinequiz2024 — seeded on first startup.
**Default competition**: `comp_default` — seeded with 4 rounds on first startup.

**Frontend routes**: `/` landing, `/waiting`, `/round`, `/result`, `/finalist`, `/eliminated`, `/projector`, `/admin/login`, `/admin/dashboard`

## TypeScript gotchas

- `UseQueryOptions` in TanStack Query v5 requires `queryKey` — pass options `as any` when Orval generates the key internally
- `useExportSubmissions` is a query hook (GET), not mutation — trigger CSV export by opening URL directly: `window.open(\`${BASE_URL}api/submissions/export?...\`)`
- `RoundInput.competitionId` is required in type but unused during competition creation (pass `''`, cast `as any`)
- `useEffect` callbacks must have consistent return types — add `return undefined` to all branches
