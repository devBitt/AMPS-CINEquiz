# 🎬 AMPS CINEquiz

A **live, real-time cinema quiz competition platform** built for events with large audiences. Participants join on their phones, answer movie-clue questions each round, and the system automatically eliminates wrong/slow answers — progressively narrowing down to finalists. A projector screen shows live results to the audience.

---

## 📸 Project Flow

```
Participants (phones)          Admin Panel                  Projector Screen
      │                             │                              │
      │  Register with Roll No.     │                              │
      ├────────────────────────────>│                              │
      │                             │  Create Round                │
      │                             │  (set emoji clue,            │
      │                             │   correct answers,           │
      │                             │   time limit)                │
      │  Receive clue + timer       │                              │
      │<────────────────────────────│──────────────────────────────│
      │                             │                              │  Shows: emoji clue
      │  Submit answer option       │                              │          + timer
      ├────────────────────────────>│                              │          + submission count
      │                             │  End Round                   │
      │                             │──────────────────────────────│
      │  Receive: Qualified ✅      │                              │  Shows: ✅ Qualified list
      │        or Eliminated ❌     │                              │          ❌ Eliminated list
      │                             │  Repeat for next round       │
      │                             │  (up to 4 rounds)            │
      │                             │                              │
      │                    FINALISTS REVEALED                      │  🎉 Finalist roll numbers
```

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React + TypeScript + Vite + TailwindCSS |
| **Backend** | Node.js + Express + TypeScript |
| **Real-time** | Socket.IO (WebSockets) |
| **Database** | SQLite (via `node:sqlite`) |
| **Auth** | JWT (admin) + session tokens (participants) |
| **Package Manager** | pnpm (monorepo workspace) |

---

## 📁 Project Structure

```
├── artifacts/
│   ├── api-server/          # Backend Express + Socket.IO server
│   │   ├── src/
│   │   │   ├── database/    # SQLite setup, schema, seed data
│   │   │   ├── middleware/  # JWT auth middleware
│   │   │   ├── routes/      # REST API routes
│   │   │   └── services/    # Business logic
│   │   │       ├── eliminationService.ts  ← elimination logic
│   │   │       ├── socketService.ts       ← real-time events
│   │   │       └── timerService.ts        ← round timer
│   │   └── cinequiz.db      # SQLite database (auto-created, gitignored)
│   │
│   └── cinequiz/            # Frontend React app
│       ├── src/
│       │   ├── pages/
│       │   │   ├── Landing.tsx            ← Participant registration
│       │   │   ├── Projector.tsx          ← Big screen display
│       │   │   ├── AdminLogin.tsx         ← Admin sign-in
│       │   │   └── AdminDashboard.tsx     ← Admin control panel
│       │   │       admin-tabs/
│       │   │           ├── SetupTab.tsx   ← Create/manage rounds
│       │   │           ├── LiveTab.tsx    ← Start/end rounds live
│       │   │           └── ParticipantsTab.tsx
│       │   └── hooks/
│       │       └── useSocket.ts           ← Socket.IO client hook
│       ├── load-test.mjs    ← Bot simulator for load testing
│       └── vite.config.local.ts  ← Local dev config (no env vars needed)
```

---

## 🚀 Running Locally

### Prerequisites
- Node.js v18+
- pnpm (`npm install -g pnpm`)

### 1. Install dependencies
```bash
pnpm install
```

### 2. Start the API server (port 3000)
```bash
cd artifacts/api-server
npm run dev
# If it asks for PORT:
$env:PORT=3000; node --enable-source-maps ./dist/index.mjs
```

### 3. Start the frontend (port 5173)
```bash
cd artifacts/cinequiz
npm run dev -- --config vite.config.local.ts
```

### 4. Open in browser

| URL | Purpose |
|---|---|
| `http://localhost:5173/` | Participant registration page |
| `http://localhost:5173/admin/login` | Admin control panel |
| `http://localhost:5173/projector` | Big screen / projector display |

---

## 🔐 Default Admin Credentials

| Field | Value |
|---|---|
| Username | `*******` |
| Password | `********` |

> ⚠️ **Change these before any real event** — see [Customization](#-customization) below.

---

## 🎮 How to Run a Competition

1. **Admin logs in** → `http://localhost:5173/admin/login`
2. **Participants register** on `http://localhost:5173/` with their roll number
3. **Open Projector** on the big screen: `http://localhost:5173/projector`
4. Admin → **Setup tab** → Create a round (set emoji clue, correct answers, time limit)
5. Admin → **Live tab** → Click **Start Round**
   - Projector shows the emoji clue + countdown timer
   - Participants see the question on their phones
6. Participants submit answers before time runs out
7. Admin → Click **End Round**
   - System auto-eliminates based on: **wrong answers first**, then **slowest correct**
   - Projector shows two columns: **✅ Qualified** and **❌ Eliminated**
8. Repeat for up to 4 rounds
9. Final round → **Finalists revealed** with confetti on the projector 🎉

---

## 🤖 Load Testing with Bots

Simulate multiple participants for testing:

```bash
cd artifacts/cinequiz

# Spawn 20 bots (resets competition to 'waiting' first)
node load-test.mjs 20 --reset

# Spawn 50 bots
node load-test.mjs 50 --reset

# Spawn 100 bots
node load-test.mjs 100 --reset
```

Each run generates a **unique run ID** so bot roll numbers never clash across runs (e.g. `B472P001`, `B472P002`...).

---

## ⚙️ Elimination Logic

Each round, participants are ranked by:
1. **Correctness** — wrong answers are eliminated first
2. **Response time** — among correct answers, slower responses are eliminated

| Round | % that advance |
|---|---|
| Round 1 | 40% (of correct answerers) |
| Round 2 | 30% |
| Round 3 | 25% |
| Round 4 | Top 2 → Finalists |

> **Key rule:** Wrong answers **always** eliminate regardless of how few participants remain.  
> If everyone gets it wrong, 1 person advances (to avoid a deadlock).

---

## 🛠️ Customization

### Change the competition name
**File:** `artifacts/api-server/src/database/db.ts`
```ts
// Line ~52 — change "CineQuiz Fest 2024" to your event name
compId, "CineQuiz Fest 2024", "waiting", 0
//      ↑ Change this
```
> Note: Delete `cinequiz.db` and restart the server to apply (it re-seeds on fresh DB).

### Change admin username & password
**File:** `artifacts/api-server/src/database/db.ts`
```ts
const passwordHash = bcrypt.hashSync("cinequiz2024", 10);  // ← change password
db.prepare(...).run(adminId, "admin", passwordHash);        // ← change username
```

### Change elimination percentages
**File:** `artifacts/api-server/src/services/eliminationService.ts`
```ts
switch (round.round_number) {
  case 1: targetCount = Math.floor(n * 0.4);  break;  // ← 40% advance
  case 2: targetCount = Math.floor(n * 0.3);  break;  // ← 30% advance
  case 3: targetCount = Math.floor(n * 0.25); break;  // ← 25% advance
  case 4: targetCount = 2; break;                     // ← always 2 finalists
}
```

### Change the app title / branding
- **Tab title:** `artifacts/cinequiz/index.html` → `<title>` tag
- **Landing page heading:** `artifacts/cinequiz/src/pages/Landing.tsx`
- **Projector header:** `artifacts/cinequiz/src/pages/Projector.tsx`

### Change the API port
Set the `PORT` environment variable when starting the API server:
```bash
$env:PORT=4000; node --enable-source-maps ./dist/index.mjs
```
Then update the proxy in `artifacts/cinequiz/vite.config.local.ts`:
```ts
proxy: {
  '/api':       { target: 'http://localhost:4000' },
  '/socket.io': { target: 'http://localhost:4000', ws: true },
}
```

### Change round time limit
Set in the Admin panel → **Setup tab** when creating a round (default: 30 seconds).  
Or change the default in `artifacts/api-server/src/database/db.ts` in the seed data.

---

## 🔌 Socket Events Reference

| Event | Direction | Description |
|---|---|---|
| `participant_join` | Client → Server | Participant joins with session token |
| `round_started` | Server → Client | Round begins, sends clue + timer |
| `submit_answer` | Client → Server | Participant submits answer |
| `round_ended` | Server → Client | Round ends |
| `qualification_result` | Server → Participant | `{ qualified: true/false }` |
| `qualification_summary` | Server → Projector | Lists of qualified/eliminated roll numbers |
| `finalists_ready` | Server → Projector | Final 2 contestants |

---

## 📝 License

@devBitt Licensed
