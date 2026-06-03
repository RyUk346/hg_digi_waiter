# HyperGlow Platform — Project Handover

> Authored in a Claude.ai chat session. Describes the **intended** architecture and product decisions. Note that the on-disk `tabletop-app/` has since diverged in stack choices (see §15).

## 1. Product Overview
**HyperGlow** is a tabletop-tablet restaurant tech SaaS platform. It eliminates the traditional waiter workflow by letting guests order, pay, and entertain themselves from a tablet at their table. Investor positioning:
1. **Revenue uplift via behavioural upsell sequencing** (15–30% AOV uplift)
2. **Cost reduction via at-table self-service**

**Tavola** is the fictional Italian bistro demo client. Tavola Soho is the primary venue. Manager: **Anton Joseph** (Operations Director on admin portal, Floor Manager on the manager app).

**Investor one-liner:** "A self-service tabletop ordering platform that drives revenue uplift via behavioural upsell sequencing and reduces operating costs by routing orders directly to the kitchen and processing payment at the table — eliminating the traditional waiter workflow."

## 2. The Four Apps
| App | Audience | Platform | Resolution | Status |
|-----|----------|----------|------------|--------|
| **Order App** | Guest (tablet at table) | React Native Android | 800×1200 portrait | HTML demo + RN project delivered |
| **Kitchen App** | Chefs (KDS at pass) | React Native Android | 1920×1080 landscape | HTML demo + RN project delivered |
| **Manager App** | Floor manager | React Native Android | 1200×800 landscape | HTML demo + RN project delivered |
| **Admin Portal** | Head office | React web | 1920×1080 desktop | HTML demo only — RN/web NOT YET BUILT |

## 3. Tech Stack (as designed in handover)
- React Native 0.74.5, TypeScript strict
- `useReducer` in `App.tsx` per app, no Redux/Zustand
- Single-screen `state.view` routing — no react-navigation
- `lucide-react-native`, `react-native-svg`, `react-native-keep-awake`, `react-native-safe-area-context`
- Backend: PostgreSQL + Redis + Stripe Terminal (or Supabase fast path)

## 4. Design System

### Light theme (Order, Manager, Admin)
```ts
colors = {
  bg: '#FBF7EE', surface: '#FFFFFF', surface2: '#F5F1E8', surface3: '#EFEADF',
  border: '#E8E2D3', ink: '#1A1715', text: '#42392F', muted: '#7A7064', mutedSoft: '#9C9384',
  terra: '#B8543D', terraSoft: '#FAEDE5', terraStrong: '#F3E4D0', terraFg: '#7A4419',
  olive: '#4A7C3F', amber: '#B8843D', red: '#C13F35', rose: '#8A322A',
  blue: '#3D6FB8', purple: '#7B5DBA',
};
```

### Kitchen dark theme
```ts
{ env: '#08070C', bg: '#0E0D0C', surface: '#1A1715', surface2: '#211D1A', surface3: '#2B2622',
  text: '#E8E2D3', textBright: '#FBF7EE', muted: '#95887A',
  stationColors: {
    grill:   { fg: '#E08838', bg: 'rgba(224,136,56,0.15)' },
    pasta:   { fg: '#5A95E0', bg: 'rgba(90,149,224,0.15)' },
    pizza:   { fg: '#D85040', bg: 'rgba(216,80,64,0.15)' },
    cold:    { fg: '#6FB35A', bg: 'rgba(111,179,90,0.15)' },
    dessert: { fg: '#B280D4', bg: 'rgba(178,128,212,0.15)' },
    bar:     { fg: '#C76B52', bg: 'rgba(199,107,82,0.15)' },
  }
}
```

### TERRACOTTA DISCIPLINE — critical product rule
**`colors.terra` (#B8543D) is reserved exclusively for HyperGlow-monetised surfaces.** Wherever a user sees terracotta, that's where HyperGlow makes money.

- **Terracotta:** build-sequence upsells, cross-sell quick-adds, drink recommendations during wait, games pricing/leaderboard, active-games indicator on KDS, AOV uplift KPIs, recovery budget, server upsell attribution, "Powered by HyperGlow" tags.
- **Black (`ink`):** primary commit actions — Send order, Place order, Send tip.
- **Olive:** success — payment received, allergen verified.
- **Red:** critical — allergen, sentiment alert, refusal of service.

### Typography
- Display/serif: Fraunces (fallback Iowan Old Style / Georgia / Charter)
- Body/sans: DM Sans (fallback system)
- Mono: Menlo / ui-monospace
- Fonts at `android/app/src/main/assets/fonts/`

## 5. Key Product Decisions

### Dining phase state machine
`pre-order → waiting → eating → paying`
- **pre-order:** Browse menu + games LOCKED ("Available once you've ordered")
- **waiting:** Countdown + drinks during wait + games ACTIVE + leaderboard
- **eating:** "Enjoy your meal" + order more (desserts/coffee/digestifs) + bill access. Games HIDDEN.
- **paying:** Split evenly / Go Dutch / pay all

### Games window rule
Games available **only during waiting phase** — between `order placed` and `last item bumped`. KDS publishes `ALL_DELIVERED` when last item is bumped, which closes the games tab on the guest tablet. Tighter window = urgency = higher conversion on the second £2 replay.

### Conservative countdown
Tablet shows **KDS estimate + 2 min buffer**. Sub-text: "First course in ~X minutes" where X = `countdownMins - 4`. Domino's principle — exceed expectations.

### Build sequence principles
- One question per screen, max 3 steps
- Show delta pricing (`+£2`) not totals
- Featured option visually heavier: warm amber/terra bg, 1px border, badge with icon
- Skip option reframed positively: "Keep it a single" not "No thanks"

### Three upsell vectors
1. **Build sequence at order time** (burger: double → meal → truffle aioli, £12 → £18)
2. **Cart cross-sells** at review screen (2×2 grid)
3. **Drinks during wait** (bar-station only, stage-rotated)

### Games catalogue
| Game | Duration | Price | Notes |
|------|----------|-------|-------|
| Italian trivia | 90s · 10Q | £2 | **Featured**, 5Q playable in demo |
| Couple's quiz | 5 min · 8 prompts | £2 | Catalogue only |
| Italian word puzzles | 3 min | £2 | Catalogue only |
| Spot the difference | 2 min | £2 | Catalogue only |

**Revenue split: 80% HyperGlow / 20% venue.** Charged via Stripe Terminal at game start, separate from food bill.

### Manager app differentiators (vs Toast/Square/Lightspeed)
1. Table sentiment alerts (headline)
2. Service recovery playbook + budget (£200/night cap)
3. Guest intelligence at table
4. Server coaching from upsell data
5. Compliance & audit (Natasha's Law)
6. Predictive operations
7. Shift handover auto-brief
8. Booking-driven occasion prompts

## 6. Delivered Artifacts (in Claude.ai session `/mnt/user-data/outputs/`)

### HTML demos
- `tavola-order-app-demo.html` (800×1200)
- `tavola-kitchen-app-demo.html` (1920×1080)
- `tavola-manager-app-demo.html` (1200×800)
- `tavola-admin-portal-demo.html` (1920×1080)

### React Native projects (single `useReducer` in App.tsx, presentational screens)
- **TavolaOrderApp/** — 24 files, 9 screens (Menu/Build/Review/Placed/Waiting/Eating/Paying/GamePlay/GameResults). Uses `react-native-svg` for countdown circle.
- **TavolaKitchenApp/** — 19 files. TopBar/FilterBar/TicketCard (memoized)/Footer/Toast. `DEMO_MODE` flag for 1min/sec time advance.
- **TavolaManagerApp/** — 23 files, 4 screens (Overview/Floor/Team/Compliance). TopBar/AlertCard/MiniTable/TableModal/Toast.

User's local working folder: `D:\HyperGlow\DigitalWaiter\tabletop-app\` — likely the Order App.

## 7. Sample Data

### Menu (Order App `data.ts`)
- **Tavola burger** £12 — build: size → meal → sauce ("Double" +£2, "Meal" +£3.50, "Truffle aioli" +£0.50)
- **Pizza Margherita** £14 — build: size → topping ("14-inch" +£4, "Burrata" +£3.50)
- **Truffle risotto** £18 (no build)
- **Ribeye 250g** £28 (no build)
- Starters: burrata £12.50, bruschetta £7, calamari £10
- Desserts: tiramisu £8, fondant £9
- Drinks: sangiovese £8.50, IPA £6, espresso £3
- Cross-sells: bruschetta, tiramisu, house-red, ipa

### Trivia (5 implemented)
1. Chianti region → Tuscany
2. Carbonara → guanciale/egg/pecorino
3. Al dente → "to the tooth"
4. Pizza birthplace → Naples
5. Tiramisù → "pick me up"

### Tonight's leaderboard
Table 9 (84), Table 4 (79), Table 7 (76), Table 10 (71)

### Manager alerts (6 in demo)
1. Sentiment · Table 7 (critical) — silent 18min after starters
2. Birthday · Table 8 — Eleanor's 30th, party 4
3. Marcus upsell drop (warning) — 15% drop, £42/hr lost
4. Service recovery · Table 4 — 24min wait, VIP, £14 spritz suggestion
5. Allergen · Table 12 (critical) — nut allergy chain complete
6. Kitchen pacing — grill heavy, slow 15min

### Server week leaderboard
| Rank | Name | Upsell rate | Covers | Revenue |
|------|------|-------------|--------|---------|
| 1 | Sofia Ricci | 41% | 124 | £4,820 |
| 2 | Aisha Patel | 38% | 108 | £4,142 |
| 3 | Diego Romano | 34% | 96 | £3,664 |
| 4 | Mia Chen | 31% | 78 | £2,964 |
| 5 | Marcus Holloway | 22% | (coaching) | £2,484 |

## 8. Infrastructure

### What goes where
**PostgreSQL** (system of record): restaurants/venues/tables/staff, menus + builds + prices + allergens, bookings, orders + lines + modifiers, payments + payouts, game plays, service recovery spend, audit log (refusals/comps/voids/allergen sign-offs), aggregated sentiment.

**Redis** (hot state): active cart per table (TTL), live KDS ticket state, dining phase per table, in-progress game state, tonight's leaderboard (sorted set), server presence, rate limits, hot menu cache.

**Pub/sub for WS fan-out:** Redis Streams OR Supabase Realtime.

**External:** Stripe Vault (PCI), Stripe Terminal (at-table card + £2 games), S3/Supabase Storage/R2 (images), AI inference (sentiment), Supabase Auth or Auth0.

### Multi-tenancy
Postgres RLS with `tenant_id` = `venue_id` on every row. Don't use per-schema or per-DB.

### Fast path: Supabase Pro ($25/mo)
Managed Postgres + Realtime + Auth + RLS + Storage. Migration path: `pg_dump` to RDS/Aurora when outgrown.

### Self-host on VPS
$20–40/mo (Hetzner/DO/Linode), 4GB/2vCPU/80GB. Bind Postgres to localhost/private network. `pgBackRest` to S3/B2 (~$5–10/mo).

### NOT to use
MongoDB (wrong shape), Firebase/Firestore (per-doc pricing punishes analytics), DynamoDB (premature access-pattern lock-in), Cassandra/Kafka/Spark stack (over-engineered until 1000+ venues).

## 9. Integration TODOs (search `// TODO:` in code)

### Order App
- `placeOrder()` — POST cart to KDS
- `payForGame()` — Stripe Terminal £2
- `addDrinkToOrder()` — POST drink line to KDS bar pipe
- `callServer()` — service-bell endpoint
- `processSplitPayment()` — Stripe split flow
- `subscribeToKitchenEvents()` — WS from KDS

### Kitchen App
- `subscribeToKDSEvents()` — WS from order app
- `publishItemBumped()` — event bus
- `publishAllDelivered()` — closes games window
- `publishPacingChange()` — 90s delay notification
- `pushAllergenAlert()` — to manager app

### Manager App
- `subscribeToAlertStream()` — WS from AI inference
- `dispatchAlertAction(alertId, label)`
- `fetchTableState()` — floor plan polling
- `serverCoachingComm(serverId, msg)` — earpiece
- `pushAllergenSignoff(tableId)`
- `compileHandoverBrief()`

## 10. Common Gradle / Android issues

### Orientation lock
`android/app/src/main/AndroidManifest.xml`:
```xml
<activity
  android:name=".MainActivity"
  android:screenOrientation="portrait"   <!-- or "landscape" -->
  android:configChanges="orientation|screenSize|keyboard|keyboardHidden">
```
Kitchen also: `android:keepScreenOn="true" android:launchMode="singleTask"`.

### react-native-svg autolinking (RN 0.74 should "just work")
```bash
cd android && ./gradlew clean && cd .. && npx react-native run-android
```

### Peer deps
```json
"lucide-react-native": "^0.379.0",
"react-native-svg": "^15.3.0"
```

### Min SDK
`react-native-svg@15` requires `minSdkVersion 23`. `android/build.gradle`:
```gradle
ext { minSdkVersion = 23; compileSdkVersion = 34; targetSdkVersion = 34 }
```

### Hermes
RN 0.74 default. If failing: `hermesEnabled=false` in `android/gradle.properties` (but Hermes recommended for prod).

### Nuke when in doubt
```bash
rm -rf node_modules android/.gradle android/app/build android/build $TMPDIR/metro-*
npm install && cd android && ./gradlew clean && cd ..
npx react-native start --reset-cache
npx react-native run-android   # other terminal
```

### Duplicate class on lucide/svg
`android/app/build.gradle`:
```gradle
android { packagingOptions {
  pickFirst '**/libreactnativejni.so'
  pickFirst '**/libjsc.so'
} }
```

## 11. Pending Work
1. **Admin Portal as React web project** (Next.js or Vite) — only HTML demo exists
2. **Connect apps to real backend** — replace hard-coded `data.ts` with API calls
3. **Auth flow** — order app kioskless, kitchen device-auth, manager+admin user login
4. **Stripe Terminal integration** — RN SDK + hardware
5. **AI sentiment inference service** — rules first, ML later
6. **WebSocket fan-out** — Supabase Realtime or Socket.io + Redis
7. **Image assets** — menu photos to S3/Storage

## 12. TavolaOrderApp file tree (handover spec)
```
TavolaOrderApp/
├── App.tsx                       # useReducer state machine + screen router
├── index.js, package.json, app.json, tsconfig.json, babel.config.js, metro.config.js, .eslintrc.js
└── src/
    ├── theme.ts                  # design tokens
    ├── types.ts                  # types + Action union
    ├── data.ts                   # MENU/GAMES/TRIVIA/WAIT_DRINKS/CATEGORIES/CROSS_SELL_IDS/LEADERBOARD
    ├── utils.ts                  # fmt, uid, byId, lineTotal, cartSubtotal, cartGrandTotal, selectionLabels, cyclePerson
    ├── components/Header.tsx
    └── screens/{Menu,Build,Review,Placed,Waiting,Eating,Paying,GamePlay,GameResults}Screen.tsx
```

## 13. Where to look
| Question | File |
|---|---|
| Guest sit-down view | `src/screens/MenuScreen.tsx` |
| Upsell flow | `src/screens/BuildScreen.tsx` + `src/data.ts` `build` arrays |
| Countdown | `src/screens/WaitingScreen.tsx` (uses `react-native-svg`) |
| Bill split | `src/screens/PayingScreen.tsx` |
| State transitions | `App.tsx` reducer |
| Colours/fonts | `src/theme.ts` |
| Data shape | `src/types.ts` |
| Sample data | `src/data.ts` |
| Pending backend | grep `// TODO:` in `App.tsx` |

## 14. Investor demo narrative
1. **Upsell engine in action** — £12 burger → £22 via 4 taps, 3 build screens
2. **Wait-time monetisation** — drinks during wait + £2 games (80/20 split)
3. **AI sentiment alerts** — Table 7 silent 18min → manager → Marcus → recovered
4. **At-table payment + bill split** — eliminates waiter, <60s split

Terracotta = visual proof of business model.

## 15. ⚠ Divergence from on-disk `tabletop-app/` (as of 2026-05-19)
The handover describes an intended architecture. The actual `D:\HyperGlow\DigitalWaiter\tabletop-app\` has diverged:

| Aspect | Handover spec | On-disk reality |
|---|---|---|
| RN version | 0.74.5 | 0.76.5 |
| Entry file | `App.tsx` (TS strict) | `App.jsx` (no TypeScript) |
| Styling | `theme.ts` + StyleSheet | NativeWind + Tailwind (`tailwind.config.js`, `global.css`) |
| State | `useReducer` only | **Zustand** (`src/store/`) — handover explicitly forbids this |
| Navigation | single-screen `state.view` | **@react-navigation/native** + native-stack (`src/navigation/`) |
| Extra deps | — | `axios`, `@react-native-async-storage/async-storage`, `react-native-reanimated`, `react-native-gesture-handler`, `react-native-orientation-locker`, `react-native-screens` |

`src/` subfolders on disk: `components/`, `constants/`, `data/`, `hooks/`, `navigation/`, `screens/`, `store/`, `utils/`.

Either the on-disk app is a re-implementation by another agent/dev that abandoned the handover's stack choices, or the handover is aspirational. **Confirm with the user which is canonical before making structural changes.**
