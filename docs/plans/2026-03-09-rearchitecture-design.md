# Dugout Intel — Rearchitecture Design

**Date:** 2026-03-09
**Author:** Rob Stover
**Status:** Approved

## Overview

Full rebuild of Dugout Intel from a single-file CRA React app into a multi-user, real-time coaching platform. Priorities in order: clean foundation, multi-user support, new features.

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router) + TypeScript |
| Backend | Convex (real-time, all-TypeScript) |
| Auth | Clerk (coaching staff sharing a team) |
| Styling | Tailwind CSS + shadcn/ui |
| Offline | IndexedDB queue for pitch mutations |
| Domain logic | Pure TS functions in `src/lib/baseball.ts` |

## Data Model

### teams
- `name`: string — "Armadillos 9U"
- `season`: string — "Spring 2026"
- `ownerId`: string — Clerk user ID

### teamMembers
- `teamId`: id("teams")
- `userId`: string — Clerk user ID
- `role`: "owner" | "coach" | "viewer"

### players
- `teamId`: id("teams")
- `name`: string
- `number`: string
- `position`: string
- `isOurPlayer`: boolean — true = roster, false = scouted opponent
- `opponentTeamName?`: string — groups scouted players
- `threat?`: string — elite/high/medium/low (opponents only)
- `notes?`: string
- `defenseNotes?`: string

### playerSeasonStats
- `playerId`: id("players")
- `season`: string
- `avg`, `obp`, `slg`, `risp`, `so`, `bb`, `sb`, `ct`, `xbh`: number
- `pitching?`: { ppi, fps, bbPerInning, fatiguePoint }

### games
- `teamId`: id("teams")
- `opponent`: string
- `date`: number (timestamp)
- `status`: "pregame" | "live" | "completed"
- `ourScore`: number
- `theirScore`: number
- `inning`: number

### pitcherAppearances
- `gameId`: id("games")
- `playerId`: id("players")
- `startInning`: number
- `endInning?`: number
- `pitchCount`: number (denormalized)
- `report?`: string

### pitchLogs
- `appearanceId`: id("pitcherAppearances")
- `gameId`: id("games")
- `isStrike`: boolean
- `velocity?`: number
- `newBatter`: boolean
- `endOfAtBat`: boolean
- `atBatResult?`: string (K, GO, FO, 1B, 2B, 3B, HR, BB, HBP)
- `timestamp`: number

### atBatResults
- `gameId`: id("games")
- `playerId`: id("players")
- `results`: string[]

### opponentPitcherLogs
- `gameId`: id("games")
- `pitcherName`: string
- `strikes`: number
- `balls`: number
- `velocities`: number[]

### pitchBudgets
- `teamId`: id("teams")
- `weekendDate`: string
- `playerName`: string
- `saturdayPitches`: number
- `notes?`: string

### Design decisions
- `players` holds both our roster and scouted opponents (distinguished by `isOurPlayer`), avoiding two near-identical tables.
- `pitchLogs` is normalized (one row per pitch) for cross-game analytics.
- `playerSeasonStats` is a denormalized rollup updated on game completion, avoiding expensive aggregation queries (Convex 1-second query limit).
- `pitcherAppearances` bridges games and pitch logs for quick "who pitched, how many" lookups.

## Domain Logic Layer

Pure TypeScript functions in `src/lib/baseball.ts` — no React or Convex dependency, testable in isolation.

### Rest & Fatigue
- `getRestInfo(pitchCount)` — rest tier lookup (0-20 = none, 21-35 = 1 day, etc.)
- `getNextThreshold(pitchCount)` — next boundary and resulting rest days
- `getWeekendAvailability(saturdayPitches)` — daily max, remaining, availability

### Pitch Analytics
- `calcStrikePct(pitches)` — strike percentage
- `calcFPS(pitches)` — first-pitch strike % (overall and last N BF)
- `calcVeloStats(velocities)` — avg, peak, recent avg, drop %
- `calcBattersFaced(pitches)` — count + per-batter FPS

### Alert Engine
- `evaluateAlerts(currentStats, prevStats, pitcherProfile)` — returns `{ message, severity }[]`
- Fires on: fatigue point, rest tier crossed, FPS < 40%, velo drop > 8%, pitch milestones (35/50/65/75)
- Replaces the 3 useEffect alert watchers with a pure function called after each pitch mutation

### Stat Aggregation (future)
- `rollupGameStats(atBatResults)` — game-level batting line
- `rollupSeasonStats(games[])` — cumulative season stats

## Convex Backend

```
convex/
├── schema.ts       # Data model
├── teams.ts        # Team CRUD, invite staff, list my teams
├── players.ts      # Roster + scouted opponent CRUD
├── games.ts        # Game lifecycle (create -> live -> complete)
├── pitching.ts     # logPitch, endAtBat, switchPitcher, getPitchingStats
├── lineup.ts       # logOurAtBat, getAtBatResults, oppPitcher tracking
├── budgets.ts      # Weekend pitch budget tracking
└── stats.ts        # Season rollups, updated on game completion
```

### Key mutations
- `pitching.logPitch` — append to pitchLogs, return updated stats + triggered alerts
- `pitching.endAtBat` — mark end of at-bat, record result, update appearance count
- `pitching.switchPitcher` — finalize current pitcher (report), start new appearance
- `lineup.logAtBat` — record our batter's result
- `lineup.logOpponentPitch` — increment opponent pitcher tracking
- `games.create` / `games.start` / `games.complete` — lifecycle transitions
- `games.updateScore` — increment/decrement

### Key queries (all real-time)
- `games.getLive` — current live game for a team
- `pitching.getStats` — pitch count, strike %, FPS, velo, rest for active pitcher
- `pitching.getStaffAvailability` — all pitchers' rest + weekly counts
- `players.getRoster` — our players with season stats
- `players.getScoutedTeam` — opponent roster by team name
- `games.getHistory` — past games with scores (future)
- `stats.getSeasonStats` — cumulative stats (future)

### Auth pattern
Every mutation/query calls `ctx.auth.getUserIdentity()` and verifies team membership via `teamMembers`. Helper: `assertTeamAccess(ctx, teamId)`.

### Alert handling
Alerts computed client-side. `pitching.logPitch` returns updated stats; frontend runs `evaluateAlerts()` and displays results. Coach messages are ephemeral client state — exported to text on demand, not persisted.

## Frontend Architecture

### Routes

```
src/app/
├── layout.tsx                 # ClerkProvider + ConvexProvider
├── page.tsx                   # Dashboard: my teams, create team
├── team/[teamId]/
│   ├── page.tsx               # Team home: roster, upcoming, availability
│   ├── roster/page.tsx        # Roster management
│   ├── scouting/page.tsx      # Scouted opponents
│   └── game/
│       ├── new/page.tsx       # Pre-game setup
│       └── [gameId]/page.tsx  # Live game view (7-tab UI)
```

### Live game components

```
src/components/game/
├── GameShell.tsx       # Tab bar, game header with score
├── PitchingTab.tsx     # Pitch logging, stats, velo chart, staff availability
├── LineupTab.tsx       # Scoreboard, opponent pitcher, our at-bats
├── ScoutingTab.tsx     # Opponent roster cards with threat levels
├── IntelTab.tsx        # Weekend pitch budgets
├── CoachTab.tsx        # Auto messages, quick alerts, export
├── FeedTab.tsx         # Live alert stream
└── ManageTab.tsx       # Edit scouted teams
```

Each tab calls its own Convex `useQuery` / `useMutation` — no prop drilling.

### Shared components

```
src/components/
├── ui/                 # shadcn primitives
├── StatBox.tsx
├── VeloChart.tsx
├── ProgressBar.tsx
├── ResultPills.tsx
├── OutcomeButtons.tsx
├── ThreatBadge.tsx
└── PlayerCard.tsx
```

### Offline queue (`src/lib/offline.ts`)
- Wraps Convex `useMutation` with IndexedDB fallback
- On pitch log: write to IndexedDB immediately, attempt mutation
- If offline: mutation queued, UI shows optimistic state
- On reconnect: replay queued mutations in order, clear queue
- Scope: only `logPitch`, `logAtBat`, `updateScore` need this

### Styling
- Tailwind CSS replaces all inline style objects
- shadcn/ui for accessible primitives (buttons, inputs, selects, cards, tabs)
- Dark mode via Tailwind `dark:` variant, toggle sets class on `<html>`
- Monospace font stack preserved: SF Mono, JetBrains Mono, Fira Code

## Migration Strategy

### Carries over
- Player/team data → Convex seed script
- REST_TIERS, getRestInfo, getNextThreshold, calcPct, arrayAvg, arrayPeak → `baseball.ts`
- Alert threshold logic → `evaluateAlerts()` in `baseball.ts`
- StatBox, VeloChart, ProgressBar, ResultPills, OutcomeButtons → rewritten with Tailwind

### Changes fundamentally
- 30+ useState → Convex queries + minimal local UI state
- localStorage → Convex database (survives across devices/sessions)
- Session export reads from Convex queries instead of local state
- Coach messages/alerts remain ephemeral client state

### Cut (YAGNI for v1)
- `window.storage` / `loadData` / `saveData` — replaced by Convex
- `build/` and `node_modules/` in git — proper `.gitignore`
- CRA / react-scripts — replaced by Next.js

### Seed data
Convex migration script (`convex/seed.ts`) checks if team exists and populates roster + scouted opponents on first run.

## Future Features (architecture supports but not built in v1)
- **Game history** — `games` table with `status: "completed"`, `/history` route
- **Season analytics** — `playerSeasonStats` rollups, trends over time
- **Lineup optimizer** — reads season stats, suggests order based on matchups
- **Pre-game scouting reports** — auto-generate from scouted opponent data
