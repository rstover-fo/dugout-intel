# Dugout Intel Rearchitecture — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild Dugout Intel as a multi-user real-time coaching platform on Next.js + Convex + Clerk.

**Architecture:** Full rebuild into Next.js App Router with Convex reactive backend, Clerk auth for coaching staff, Tailwind + shadcn/ui for styling. Domain logic extracted into pure TypeScript functions. See `docs/plans/2026-03-09-rearchitecture-design.md` for full design.

**Tech Stack:** Next.js 15, TypeScript, Convex, Clerk, Tailwind CSS, shadcn/ui

**Reference:** The existing `src/App.jsx` contains all current game logic and data to port.

---

## Sprint 1: Foundation (Project Setup + Core Schema)

### Task 1: Scaffold Next.js + Convex project

**Files:**
- Create: new project root (reinitialize from scratch)
- Create: `.gitignore`
- Create: `convex/schema.ts`

**Step 1: Initialize project**

From the parent directory (`/Users/robstover/Development/personal/`), scaffold:

```bash
npm create convex@latest dugout-intel-v2
```

Select: Next.js, TypeScript. This creates the project with Convex pre-configured.

**Step 2: Verify it runs**

```bash
cd dugout-intel-v2
npm run dev
```

Verify the Next.js dev server starts and the Convex dashboard is accessible.

**Step 3: Add .gitignore**

Ensure `.gitignore` includes:
```
node_modules/
.next/
build/
.env.local
.env
```

**Step 4: Initial commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Next.js + Convex project"
```

---

### Task 2: Install and configure Tailwind + shadcn/ui

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`
- Create: `components.json`
- Create: `src/lib/utils.ts`

**Step 1: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

Select: New York style, Neutral base color, CSS variables enabled.

**Step 2: Add core shadcn components**

```bash
npx shadcn@latest add button card input label select tabs badge
```

**Step 3: Set monospace font in Tailwind config**

In `tailwind.config.ts`, extend `fontFamily.mono`:
```typescript
fontFamily: {
  mono: ["'SF Mono'", "'JetBrains Mono'", "'Fira Code'", "monospace"],
},
```

**Step 4: Verify build**

```bash
npm run build
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Tailwind + shadcn/ui with monospace font"
```

---

### Task 3: Set up Clerk auth

**Files:**
- Create: `src/app/ConvexClientProvider.tsx`
- Modify: `src/app/layout.tsx`
- Create: `middleware.ts`
- Create: `convex/auth.config.ts`

**Step 1: Install Clerk**

```bash
npm install @clerk/nextjs
```

**Step 2: Create Clerk application**

Go to https://clerk.com, create an application. Get `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. Add to `.env.local`.

In Clerk Dashboard → JWT Templates, create a template named `convex` with issuer set to your Clerk Frontend API URL.

**Step 3: Create ConvexClientProvider with Clerk**

```typescript
// src/app/ConvexClientProvider.tsx
"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
```

**Step 4: Update layout.tsx**

```typescript
// src/app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "./ConvexClientProvider";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-mono">
        <ClerkProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
```

**Step 5: Create middleware.ts**

```typescript
// middleware.ts (project root)
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

**Step 6: Create Convex auth config**

```typescript
// convex/auth.config.ts
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
};
```

Set `CLERK_JWT_ISSUER_DOMAIN` as an environment variable in the Convex Dashboard.

**Step 7: Verify auth flow**

Run `npm run dev`, visit the app. Should redirect to Clerk sign-in. After signing in, the app loads.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Clerk auth with Convex integration"
```

---

### Task 4: Define Convex schema

**Files:**
- Create: `convex/schema.ts`

**Step 1: Write the schema**

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  teams: defineTable({
    name: v.string(),
    season: v.string(),
    ownerId: v.string(),
  }).index("by_owner", ["ownerId"]),

  teamMembers: defineTable({
    teamId: v.id("teams"),
    userId: v.string(),
    role: v.union(v.literal("owner"), v.literal("coach"), v.literal("viewer")),
  })
    .index("by_team", ["teamId"])
    .index("by_user", ["userId"]),

  players: defineTable({
    teamId: v.id("teams"),
    name: v.string(),
    number: v.string(),
    position: v.string(),
    isOurPlayer: v.boolean(),
    opponentTeamName: v.optional(v.string()),
    threat: v.optional(v.string()),
    notes: v.optional(v.string()),
    defenseNotes: v.optional(v.string()),
  })
    .index("by_team", ["teamId"])
    .index("by_team_and_type", ["teamId", "isOurPlayer"])
    .index("by_opponent", ["teamId", "opponentTeamName"]),

  playerSeasonStats: defineTable({
    playerId: v.id("players"),
    season: v.string(),
    avg: v.number(),
    obp: v.number(),
    slg: v.number(),
    risp: v.number(),
    so: v.number(),
    bb: v.number(),
    sb: v.number(),
    ct: v.number(),
    xbh: v.number(),
    pitching: v.optional(v.object({
      ppi: v.number(),
      fps: v.number(),
      bbPerInning: v.number(),
      fatiguePoint: v.number(),
    })),
  }).index("by_player", ["playerId"]),

  games: defineTable({
    teamId: v.id("teams"),
    opponent: v.string(),
    date: v.number(),
    status: v.union(v.literal("pregame"), v.literal("live"), v.literal("completed")),
    ourScore: v.number(),
    theirScore: v.number(),
    inning: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_team_and_status", ["teamId", "status"]),

  pitcherAppearances: defineTable({
    gameId: v.id("games"),
    playerId: v.id("players"),
    startInning: v.number(),
    endInning: v.optional(v.number()),
    pitchCount: v.number(),
    report: v.optional(v.string()),
  }).index("by_game", ["gameId"]),

  pitchLogs: defineTable({
    appearanceId: v.id("pitcherAppearances"),
    gameId: v.id("games"),
    isStrike: v.boolean(),
    velocity: v.optional(v.number()),
    newBatter: v.boolean(),
    endOfAtBat: v.boolean(),
    atBatResult: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_appearance", ["appearanceId"])
    .index("by_game", ["gameId"]),

  atBatResults: defineTable({
    gameId: v.id("games"),
    playerId: v.id("players"),
    results: v.array(v.string()),
  })
    .index("by_game", ["gameId"])
    .index("by_player", ["playerId"]),

  opponentPitcherLogs: defineTable({
    gameId: v.id("games"),
    pitcherName: v.string(),
    strikes: v.number(),
    balls: v.number(),
    velocities: v.array(v.number()),
  }).index("by_game", ["gameId"]),

  pitchBudgets: defineTable({
    teamId: v.id("teams"),
    weekendDate: v.string(),
    playerName: v.string(),
    saturdayPitches: v.number(),
    notes: v.optional(v.string()),
  }).index("by_team_and_weekend", ["teamId", "weekendDate"]),
});
```

**Step 2: Run Convex dev to validate schema**

```bash
npx convex dev
```

Should push the schema to Convex without errors.

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: define Convex data schema"
```

---

### Task 5: Extract domain logic into baseball.ts

**Files:**
- Create: `src/lib/baseball.ts`
- Create: `src/lib/__tests__/baseball.test.ts`

**Step 1: Install test runner**

```bash
npm install -D vitest
```

Add to `package.json` scripts: `"test": "vitest"`

**Step 2: Write failing tests**

```typescript
// src/lib/__tests__/baseball.test.ts
import { describe, it, expect } from "vitest";
import {
  getRestInfo,
  getNextThreshold,
  calcPct,
  arrayAvg,
  arrayPeak,
  isOut,
  isHit,
  evaluateAlerts,
  calcBattersFaced,
  calcFPS,
  calcVeloStats,
} from "../baseball";

describe("getRestInfo", () => {
  it("returns Available for 0 pitches", () => {
    expect(getRestInfo(0)).toEqual({ days: 0, label: "Available" });
  });
  it("returns no rest for 1-20 pitches", () => {
    expect(getRestInfo(15).days).toBe(0);
  });
  it("returns 1 day for 21-35", () => {
    expect(getRestInfo(30).days).toBe(1);
  });
  it("returns 4 days for 66-75", () => {
    expect(getRestInfo(70).days).toBe(4);
  });
  it("returns 4+ for over 75", () => {
    expect(getRestInfo(80).days).toBe(4);
  });
});

describe("getNextThreshold", () => {
  it("returns 20 threshold when at 10 pitches", () => {
    const result = getNextThreshold(10);
    expect(result?.threshold).toBe(20);
  });
  it("returns null when at max", () => {
    expect(getNextThreshold(75)).toBeNull();
  });
});

describe("calcPct", () => {
  it("calculates percentage", () => {
    expect(calcPct(3, 10)).toBe("30");
  });
  it("returns -- for zero denominator", () => {
    expect(calcPct(0, 0)).toBe("--");
  });
});

describe("arrayAvg / arrayPeak", () => {
  it("calculates average", () => {
    expect(arrayAvg([50, 60, 70])).toBe("60.0");
  });
  it("calculates peak", () => {
    expect(arrayPeak([50, 70, 60])).toBe("70.0");
  });
  it("returns -- for empty arrays", () => {
    expect(arrayAvg([])).toBe("--");
    expect(arrayPeak([])).toBe("--");
  });
});

describe("isOut / isHit", () => {
  it("identifies outs", () => {
    expect(isOut("K")).toBe(true);
    expect(isOut("GO")).toBe(true);
    expect(isOut("FO")).toBe(true);
    expect(isOut("1B")).toBe(false);
  });
  it("identifies hits", () => {
    expect(isHit("1B")).toBe(true);
    expect(isHit("HR")).toBe(true);
    expect(isHit("K")).toBe(false);
    expect(isHit("BB")).toBe(false);
  });
});

describe("calcBattersFaced", () => {
  it("counts batters from pitch log", () => {
    const pitches = [
      { s: true, nb: true, end: false },
      { s: false, nb: false, end: true },
      { s: true, nb: true, end: false },
      { s: true, nb: false, end: true },
    ];
    expect(calcBattersFaced(pitches)).toBe(2);
  });
});

describe("calcFPS", () => {
  it("calculates first pitch strike percentage", () => {
    const pitches = [
      { s: true, nb: true, end: true },   // BF1: FPS = true
      { s: false, nb: true, end: false },  // BF2: FPS = false
      { s: true, nb: false, end: true },
      { s: true, nb: true, end: true },    // BF3: FPS = true
    ];
    expect(calcFPS(pitches)).toBe("67"); // 2/3
  });
});

describe("calcVeloStats", () => {
  it("computes avg, peak, drop", () => {
    const velos = [60, 62, 61, 58, 55];
    const stats = calcVeloStats(velos);
    expect(stats.avg).toBe("59.2");
    expect(stats.peak).toBe("62.0");
    expect(+stats.dropPct!).toBeGreaterThan(0);
  });
});

describe("evaluateAlerts", () => {
  it("fires fatigue alert at pitcher fatigue point", () => {
    const alerts = evaluateAlerts(
      { pitchCount: 28, prevPitchCount: 27, fpsLast5: "60", prevFpsLast5: "60", veloDropPct: null, prevVeloDropPct: null },
      { fatiguePoint: 28, name: "Grawunder #2" }
    );
    expect(alerts.some(a => a.severity === "warning" && a.message.includes("fatigue"))).toBe(true);
  });
  it("fires danger alert at 35 pitches", () => {
    const alerts = evaluateAlerts(
      { pitchCount: 35, prevPitchCount: 34, fpsLast5: "60", prevFpsLast5: "60", veloDropPct: null, prevVeloDropPct: null },
      { fatiguePoint: 35, name: "Sidor #1" }
    );
    expect(alerts.some(a => a.severity === "danger" && a.message.includes("35"))).toBe(true);
  });
  it("fires FPS warning when below 40%", () => {
    const alerts = evaluateAlerts(
      { pitchCount: 30, prevPitchCount: 30, fpsLast5: "33", prevFpsLast5: "50", veloDropPct: null, prevVeloDropPct: null },
      { fatiguePoint: 35, name: "Sidor #1" }
    );
    expect(alerts.some(a => a.severity === "warning" && a.message.includes("FPS"))).toBe(true);
  });
  it("fires velo drop danger when >8%", () => {
    const alerts = evaluateAlerts(
      { pitchCount: 30, prevPitchCount: 30, fpsLast5: "60", prevFpsLast5: "60", veloDropPct: "9.5", prevVeloDropPct: null },
      { fatiguePoint: 35, name: "Sidor #1" }
    );
    expect(alerts.some(a => a.severity === "danger" && a.message.includes("velo"))).toBe(true);
  });
});
```

**Step 3: Run tests to verify they fail**

```bash
npm test -- --run
```

Expected: all tests fail (module not found).

**Step 4: Implement baseball.ts**

```typescript
// src/lib/baseball.ts

// --- Constants ---
const OUTS = new Set(["K", "GO", "FO"]);
const HITS = new Set(["1B", "2B", "3B", "HR"]);
const NON_AB = new Set(["BB", "HBP"]);

export const ALL_OUTCOMES = ["K", "GO", "FO", "1B", "2B", "3B", "HR", "BB", "HBP"] as const;
export type AtBatResult = (typeof ALL_OUTCOMES)[number];

export const PITCHER_OUTCOMES: [AtBatResult, string][] = [["K","#34d399"],["GO","#34d399"],["FO","#34d399"],["1B","#eab308"],["2B","#eab308"],["3B","#ea580c"],["BB","#ef4444"],["HBP","#ef4444"]];
export const BATTER_OUTCOMES: [AtBatResult, string][] = [["1B","#34d399"],["2B","#34d399"],["3B","#34d399"],["HR","#34d399"],["BB","#eab308"],["HBP","#eab308"],["K","#ef4444"],["GO","#ef4444"],["FO","#ef4444"]];

export const DAILY_PITCH_MAX = 75;
export const WEEKEND_PITCH_MAX = 100;

export const REST_TIERS = [
  { min: 1, max: 20, days: 0, label: "No rest" },
  { min: 21, max: 35, days: 1, label: "1 day" },
  { min: 36, max: 50, days: 2, label: "2 days" },
  { min: 51, max: 65, days: 3, label: "3 days" },
  { min: 66, max: 75, days: 4, label: "4 days" },
] as const;

// --- Classifiers ---
export function isOut(r: string): boolean { return OUTS.has(r); }
export function isHit(r: string): boolean { return HITS.has(r); }
export function isNonAB(r: string): boolean { return NON_AB.has(r); }

// --- Rest & Fatigue ---
export interface RestInfo { days: number; label: string; }

export function getRestInfo(pitchCount: number): RestInfo {
  if (pitchCount === 0) return { days: 0, label: "Available" };
  for (const tier of REST_TIERS) {
    if (pitchCount >= tier.min && pitchCount <= tier.max) return { days: tier.days, label: tier.label };
  }
  return { days: 4, label: "4+ days" };
}

export function getNextThreshold(pitchCount: number): { threshold: number; nextRestDays: number } | null {
  for (const tier of REST_TIERS) {
    if (pitchCount < tier.max) return { threshold: tier.max, nextRestDays: getRestInfo(tier.max + 1).days };
  }
  return null;
}

export function getWeekendAvailability(saturdayPitches: number) {
  const remaining = WEEKEND_PITCH_MAX - saturdayPitches;
  const restDay = getRestInfo(saturdayPitches);
  const canPitch = restDay.days === 0;
  const dailyMax = Math.min(remaining, DAILY_PITCH_MAX);
  return { remaining, canPitch, dailyMax, restDay };
}

// --- Math Helpers ---
export function calcPct(num: number, den: number): string {
  return den > 0 ? ((num / den) * 100).toFixed(0) : "--";
}

export function arrayAvg(arr: number[]): string {
  return arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "--";
}

export function arrayPeak(arr: number[]): string {
  return arr.length > 0 ? Math.max(...arr).toFixed(1) : "--";
}

// --- Pitch Analytics ---
export interface Pitch { s: boolean; nb: boolean; end: boolean; }

export function calcBattersFaced(pitches: Pitch[]): number {
  let count = 0;
  for (let i = 0; i < pitches.length; i++) {
    if (pitches[i].nb) count++;
  }
  return count;
}

export function calcFPS(pitches: Pitch[]): string {
  const batters: { fps: boolean }[] = [];
  let current: Pitch[] = [];
  pitches.forEach((p, i) => {
    if (p.nb && i > 0) { batters.push({ fps: current[0]?.s || false }); current = []; }
    current.push(p);
  });
  if (current.length > 0) batters.push({ fps: current[0]?.s || false });
  return calcPct(batters.filter(b => b.fps).length, batters.length);
}

export function calcFPSLast5(pitches: Pitch[]): string {
  const batters: { fps: boolean }[] = [];
  let current: Pitch[] = [];
  pitches.forEach((p, i) => {
    if (p.nb && i > 0) { batters.push({ fps: current[0]?.s || false }); current = []; }
    current.push(p);
  });
  if (current.length > 0) batters.push({ fps: current[0]?.s || false });
  const last5 = batters.slice(-5);
  return last5.length >= 3 ? calcPct(last5.filter(b => b.fps).length, last5.length) : "--";
}

export interface VeloStats { avg: string; peak: string; recentAvg: string; dropPct: string | null; }

export function calcVeloStats(velocities: number[]): VeloStats {
  const avg = arrayAvg(velocities);
  const peak = arrayPeak(velocities);
  const recent = velocities.slice(-5);
  const recentAvg = arrayAvg(recent);
  const dropPct = velocities.length >= 5 && +peak > 0
    ? ((1 - +recentAvg / +peak) * 100).toFixed(1)
    : null;
  return { avg, peak, recentAvg, dropPct };
}

// --- Alert Engine ---
export interface AlertInput {
  pitchCount: number;
  prevPitchCount: number;
  fpsLast5: string;
  prevFpsLast5: string;
  veloDropPct: string | null;
  prevVeloDropPct: string | null;
}

export interface PitcherProfile {
  fatiguePoint: number;
  name: string;
}

export interface Alert {
  message: string;
  severity: "danger" | "warning" | "info";
}

export function evaluateAlerts(input: AlertInput, profile: PitcherProfile): Alert[] {
  const alerts: Alert[] = [];
  const { pitchCount, prevPitchCount, fpsLast5, prevFpsLast5, veloDropPct, prevVeloDropPct } = input;
  const { fatiguePoint, name } = profile;

  // Fatigue point
  if (pitchCount === fatiguePoint && prevPitchCount < fatiguePoint) {
    alerts.push({ message: `${name} at fatigue point (${fatiguePoint}p)`, severity: "warning" });
  }

  // Rest tier crossings
  const nextTh = getNextThreshold(prevPitchCount);
  if (nextTh && pitchCount >= nextTh.threshold && prevPitchCount < nextTh.threshold) {
    alerts.push({ message: `${name} crossed ${nextTh.threshold}p -- now ${nextTh.nextRestDays} rest days`, severity: "danger" });
  }

  // Milestone alerts
  if (pitchCount >= 35 && prevPitchCount < 35) alerts.push({ message: `${name} at 35 -- 1d rest. +1 more=2d!`, severity: "danger" });
  if (pitchCount >= 50 && prevPitchCount < 50) alerts.push({ message: `${name} AT 50. 2d rest.`, severity: "danger" });
  if (pitchCount >= 65 && prevPitchCount < 65) alerts.push({ message: `${name} AT 65. 3d. +1=4d!`, severity: "danger" });
  if (pitchCount >= 75 && prevPitchCount < 75) alerts.push({ message: `${name} AT 75 PG MAX. PULL.`, severity: "danger" });

  // FPS decline
  if (fpsLast5 !== "--" && +fpsLast5 < 40 && fpsLast5 !== prevFpsLast5) {
    alerts.push({ message: `${name} FPS at ${fpsLast5}%`, severity: "warning" });
  }

  // Velo drop
  if (veloDropPct && +veloDropPct > 8 && veloDropPct !== prevVeloDropPct) {
    alerts.push({ message: `${name} velo down ${veloDropPct}%`, severity: "danger" });
  }

  return alerts;
}
```

**Step 5: Run tests**

```bash
npm test -- --run
```

Expected: all tests pass.

**Step 6: Commit**

```bash
git add src/lib/baseball.ts src/lib/__tests__/baseball.test.ts package.json
git commit -m "feat: extract domain logic into baseball.ts with tests"
```

---

### Task 6: Build Convex auth helper + team functions

**Files:**
- Create: `convex/helpers.ts`
- Create: `convex/teams.ts`

**Step 1: Create auth helper**

```typescript
// convex/helpers.ts
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export async function getAuthUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.tokenIdentifier;
}

export async function assertTeamAccess(ctx: QueryCtx | MutationCtx, teamId: Id<"teams">): Promise<string> {
  const userId = await getAuthUserId(ctx);
  const member = await ctx.db
    .query("teamMembers")
    .withIndex("by_team", (q) => q.eq("teamId", teamId))
    .collect();
  const isMember = member.some((m) => m.userId === userId);
  if (!isMember) throw new Error("Not a member of this team");
  return userId;
}
```

**Step 2: Create team functions**

```typescript
// convex/teams.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId, assertTeamAccess } from "./helpers";

export const listMyTeams = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const teams = await Promise.all(
      memberships.map((m) => ctx.db.get(m.teamId))
    );
    return teams.filter(Boolean);
  },
});

export const create = mutation({
  args: { name: v.string(), season: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const teamId = await ctx.db.insert("teams", {
      name: args.name,
      season: args.season,
      ownerId: userId,
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userId,
      role: "owner",
    });
    return teamId;
  },
});

export const getTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    await assertTeamAccess(ctx, args.teamId);
    return await ctx.db.get(args.teamId);
  },
});

export const inviteMember = mutation({
  args: { teamId: v.id("teams"), userId: v.string(), role: v.union(v.literal("coach"), v.literal("viewer")) },
  handler: async (ctx, args) => {
    await assertTeamAccess(ctx, args.teamId);
    await ctx.db.insert("teamMembers", {
      teamId: args.teamId,
      userId: args.userId,
      role: args.role,
    });
  },
});
```

**Step 3: Run Convex dev to validate**

```bash
npx convex dev
```

Should push without errors.

**Step 4: Commit**

```bash
git add convex/helpers.ts convex/teams.ts
git commit -m "feat: add auth helpers and team CRUD functions"
```

---

## Sprint 2: Core Game Loop (Pitching + Lineup)

### Task 7: Build Convex pitching functions

**Files:**
- Create: `convex/pitching.ts`

Implement: `logPitch`, `endAtBat`, `switchPitcher`, `getStats`, `getStaffAvailability`

These are the most critical mutations — the core of the live game experience. `logPitch` appends to `pitchLogs` and updates the `pitcherAppearances` pitch count. `getStats` returns computed pitch stats for the active pitcher.

**Commit message:** `feat: add Convex pitching mutations and queries`

---

### Task 8: Build Convex game + lineup functions

**Files:**
- Create: `convex/games.ts`
- Create: `convex/lineup.ts`

Implement game lifecycle (`create`, `start`, `complete`, `updateScore`, `getLive`, `getHistory`) and lineup functions (`logAtBat`, `getAtBatResults`, `logOpponentPitch`, `getOpponentPitcher`).

**Commit message:** `feat: add game lifecycle and lineup functions`

---

### Task 9: Build Convex player + scouting functions

**Files:**
- Create: `convex/players.ts`

Implement: `getRoster`, `getScoutedTeam`, `listOpponentTeams`, `addPlayer`, `updatePlayer`, `removePlayer`

**Commit message:** `feat: add player and scouting functions`

---

### Task 10: Build Convex budget functions

**Files:**
- Create: `convex/budgets.ts`

Implement: `addBudgetEntry`, `removeBudgetEntry`, `getBudgetForWeekend`, `listBudgetTeams`

**Commit message:** `feat: add weekend pitch budget functions`

---

## Sprint 3: Frontend — Shared Components

### Task 11: Build shared UI components with Tailwind

**Files:**
- Create: `src/components/StatBox.tsx`
- Create: `src/components/VeloChart.tsx`
- Create: `src/components/ProgressBar.tsx`
- Create: `src/components/ResultPills.tsx`
- Create: `src/components/OutcomeButtons.tsx`
- Create: `src/components/ThreatBadge.tsx`
- Create: `src/components/PlayerCard.tsx`

Port each component from the current `App.jsx`, replacing inline styles with Tailwind classes. Use shadcn/ui `Card`, `Button`, `Badge` as primitives where appropriate.

**Commit message:** `feat: add shared baseball UI components`

---

## Sprint 4: Frontend — Pages + Live Game

### Task 12: Build dashboard page (team list + create)

**Files:**
- Modify: `src/app/page.tsx`

Shows list of user's teams via `useQuery(api.teams.listMyTeams)`. Create team button opens a form that calls `useMutation(api.teams.create)`.

**Commit message:** `feat: add team dashboard page`

---

### Task 13: Build team home page

**Files:**
- Create: `src/app/team/[teamId]/page.tsx`
- Create: `src/app/team/[teamId]/layout.tsx`

Shows roster overview, staff availability, and a "Start Game" button. Links to roster management and scouting.

**Commit message:** `feat: add team home page`

---

### Task 14: Build live game shell + PitchingTab

**Files:**
- Create: `src/app/team/[teamId]/game/[gameId]/page.tsx`
- Create: `src/components/game/GameShell.tsx`
- Create: `src/components/game/PitchingTab.tsx`

The core game view. `GameShell` renders the tab bar and header. `PitchingTab` is the first tab — pitch logging, stats display, velo chart, staff availability. This is the highest-priority UI since it's used every at-bat.

**Commit message:** `feat: add live game view with pitching tab`

---

### Task 15: Build LineupTab + ScoutingTab

**Files:**
- Create: `src/components/game/LineupTab.tsx`
- Create: `src/components/game/ScoutingTab.tsx`

Lineup: scoreboard, opponent pitcher tracker, our at-bat logging. Scouting: opponent roster cards with threat levels, expandable approach/defense notes.

**Commit message:** `feat: add lineup and scouting tabs`

---

### Task 16: Build CoachTab + FeedTab + IntelTab

**Files:**
- Create: `src/components/game/CoachTab.tsx`
- Create: `src/components/game/FeedTab.tsx`
- Create: `src/components/game/IntelTab.tsx`

Coach: messages, quick alerts, session export. Feed: live alert stream. Intel: weekend pitch budgets.

**Commit message:** `feat: add coach, feed, and intel tabs`

---

## Sprint 5: Roster + Scouting Management

### Task 17: Build roster management page

**Files:**
- Create: `src/app/team/[teamId]/roster/page.tsx`

Full CRUD for our players. Add/edit/remove with season stats.

**Commit message:** `feat: add roster management page`

---

### Task 18: Build scouting management page

**Files:**
- Create: `src/app/team/[teamId]/scouting/page.tsx`

CRUD for scouted opponent teams and players. Port the current ManageTab functionality.

**Commit message:** `feat: add scouting management page`

---

## Sprint 6: Seed Data + Offline + Polish

### Task 19: Create seed script for existing data

**Files:**
- Create: `convex/seed.ts`

Migration script that inserts the current hardcoded team data (OUR_PITCHERS, OUR_BATTING_ORDER, SCOUTED_TEAMS) into Convex for first-time setup.

**Commit message:** `feat: add seed script for initial team data`

---

### Task 20: Build offline mutation queue

**Files:**
- Create: `src/lib/offline.ts`
- Create: `src/hooks/useOfflineMutation.ts`

IndexedDB-backed queue that wraps `useMutation` for `logPitch`, `logAtBat`, and `updateScore`. Queues mutations when offline, replays on reconnect.

**Commit message:** `feat: add offline mutation queue with IndexedDB`

---

### Task 21: Pre-game setup page

**Files:**
- Create: `src/app/team/[teamId]/game/new/page.tsx`

Select opponent, confirm lineup, create game in "pregame" status, then transition to "live" and redirect to the game view.

**Commit message:** `feat: add pre-game setup page`

---

### Task 22: Dark mode + final polish

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/layout.tsx`
- Modify: various components

Wire up dark mode toggle via Tailwind `dark:` classes. Default to dark. Ensure mobile-first layout (max-w-lg, touch-friendly tap targets). Test all tabs end-to-end.

**Commit message:** `feat: add dark mode toggle and mobile polish`

---

### Task 23: Final verification + push

- Run full test suite: `npm test -- --run`
- Run build: `npm run build`
- Run linter: `npx next lint`
- Manual smoke test of all 7 tabs in a live game flow
- Git push to remote

```bash
git push origin main
```
