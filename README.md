# FunDue

> **Personal finance app built for variable income earners** — servers, bartenders, and gig workers who get paid in tips and need a smarter way to stay on top of bills, savings, and debt.

FunDue turns every shift into an automatic budget. Log your income, and the app instantly allocates it across your bills, savings, emergency fund, and spending money — prioritizing what's due soonest, never overfunding what's already covered.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Allocation Algorithm](#allocation-algorithm)
- [Getting Started](#getting-started)
- [Branches](#branches)
- [Roadmap](#roadmap)

---

## Overview

Most budgeting apps assume you get paid the same amount every two weeks. FunDue doesn't. It's built around the reality of shift work — income varies, bills are fixed, and the gap between them requires daily attention.

**Core loop:**
1. You finish a shift and open the app
2. Enter the amount — tips or paycheck
3. FunDue allocates it: bills first (by urgency and due date), then savings, emergency fund, and whatever's left is yours
4. Track progress across the month, monitor debts, and build toward savings goals

Everything lives on-device. No account required. No server. No subscription.

---

## Features

### Home Tab
- **Monthly coverage card** — total income logged this month, progress bar showing % of bills covered, and a projection of whether you're on track
- **Quick Stats card** — avg shift this month, next bill due (with name, amount, days left), and total savings balance across all buckets
- **Average by day of week** — bar chart showing your best and worst earning days so you can plan smarter
- **Income entry form** — select income type (cash tips or paycheck), pick the shift date via a calendar, enter amount and an optional note
- **Calendar date picker** — full month grid with month navigation (up to 6 months back), today highlighted, past shifts marked with a teal dot, future dates grayed out

### Budget Tab
- **Bill coverage progress** — shows how much of your total monthly fixed expenses has been funded this month
- **Bills grouped by priority** — Critical → High → Normal → Low, each with a progress bar, funded vs target amount, and days until due
- **Manual contribution** — long-press any bill to open a contribution modal: enter a custom amount, mark as fully paid, or review and remove recent manual entries to correct mistakes

### Insights Tab
- **Shift stats** — best shift, average shift, worst shift
- **Best week ever** card
- **Total earned all time** with shift count
- **Debt tracker** — all debts displayed with live balances, progress bars, urgency levels, and contextual advice:
  - *Promo cards* (CITI, Discover): 0% expiry countdown, monthly amount needed to pay off in time
  - *Student loans*: APR, deferment status, days until payments begin
  - *Truck loan*: amortization-based remaining balance, months left, and a live monthly payment progress bar fed directly from Budget tab Car Payment contributions
- **Debt payments** — long-press any debt card to record a payment; balance updates immediately; RECENT section shows last 5 payments with a Remove button to correct mistakes
- **Recent shifts** — last 10 shifts with personal/savings/emergency breakdown

### Buckets Tab
- **Savings buckets** — named savings goals with optional target amounts and color-coded progress bars
- **Add money** — tap "+ Add Money" on any bucket to contribute; panel stays open so you can review and correct entries inline
- **RECENT history** — shows last 5 contributions per bucket; tap Remove to undo a wrong entry and immediately correct the balance
- **Edit / Delete** — long-press any bucket to rename it, update the goal, or delete it
- **Quick suggestions** — preset bucket goals (3-month expenses, 6-month expenses, CITI payoff, Vacation, New Tires)

### Allocation Result Screen
- Shown immediately after logging a shift
- Displays the full allocation breakdown: personal cut, savings, emergency, and every bill funded/partially funded/unfunded
- **Already covered** section — bills fully funded this month are acknowledged separately
- **Partial and unfunded** bills — shows progress bars and amounts still needed
- **Leftover splitter** — if discretionary money remains, lets you distribute it across savings buckets directly from the result screen

### Correction System (All Three Areas)
Every manual contribution — bills, buckets, and debts — shows a **RECENT** section with the last 5 entries and a **Remove** button. Removing any entry instantly:
- Deletes the DB record
- Recalculates and updates the live balance or funded total
- Refreshes all related UI

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Language | JavaScript (ES2022) |
| Database | expo-sqlite (SQLite, fully local, synchronous API) |
| State | React `useState` / `useCallback` |
| Navigation | Manual tab state (no navigation library) |
| Target platform | iOS (TestFlight distribution) |
| Min Expo SDK | 54.0.33 |
| React | 19.1.0 |
| React Native | 0.81.5 |

**No backend. No network requests. No analytics. Everything stays on the device.**

---

## Project Structure

```
fundue/
├── App.js                        # Entire UI — 4 tabs, all modals, all state
├── app.json                      # Expo config (name: FunDue, slug: fundue)
├── index.js                      # Entry point
├── src/
│   ├── algorithm/
│   │   ├── algorithm.js          # allocate(), getMonthlySummary(), getInsights(), getDebtSummary()
│   │   └── test.js               # Algorithm unit tests
│   ├── constants/
│   │   ├── expenses.js           # EXPENSES array, TOTAL_FIXED, DEFAULT_SETTINGS
│   │   └── theme.js              # colors object (dark theme, #00d4a8 teal accent)
│   └── db/
│       └── database.js           # All SQLite functions (synchronous)
└── assets/                       # Icons and splash screen
```

### Key files

**`App.js`** — Single-file UI. All four tabs, every modal, and all React state live here. No navigation library; tab switching is managed with a single `tab` state string.

**`src/algorithm/algorithm.js`** — Pure logic, no DB calls (except `getDebtSummary` which accepts pre-loaded payment totals). The allocation engine reads bill progress passed in as a parameter so it never touches state or DB directly.

**`src/db/database.js`** — All database access. Uses `SQLite.openDatabaseSync` (synchronous). Every function is a plain export — no classes, no hooks.

**`src/constants/expenses.js`** — The hardcoded bills list. `EXPENSES` is an array of expense objects with `id`, `name`, `category`, `amount`, `priority`, and `dueDay`. `TOTAL_FIXED` is the sum of all monthly bills.

---

## Database Schema

All data is stored locally in `budgetos15.db` via expo-sqlite.

### `settings`
| Column | Type | Description |
|---|---|---|
| id | INTEGER PK | Always row 1 |
| savings_pct | REAL | Savings allocation % (default 0.15) |
| emergency_pct | REAL | Emergency allocation % (default 0.05) |
| personal_pct | REAL | Personal cut % (default 0.20) |
| bills_pct | REAL | Bills pool % (default 0.60) |

### `expenses`
Seeded from `EXPENSES` constant on first launch.

| Column | Type | Description |
|---|---|---|
| id | INTEGER PK | Matches constant array id |
| name | TEXT | Bill name |
| category | TEXT | Housing / Transport / Utilities / etc. |
| amount | REAL | Monthly amount |
| priority | INTEGER | 1=Critical, 2=High, 3=Normal, 4=Low |
| due_day | INTEGER | Day of month bill is due |

### `income_entries`
| Column | Type | Description |
|---|---|---|
| id | INTEGER AUTOINCREMENT PK | |
| amount | REAL | Shift income amount |
| income_type | TEXT | `'tips'` or `'paycheck'` |
| note | TEXT | Optional shift note |
| shift_date | TEXT | ISO date string (YYYY-MM-DD) |
| created_at | TEXT | ISO timestamp |

### `allocations`
One row per income entry with the calculated split.

| Column | Type | Description |
|---|---|---|
| income_entry_id | INTEGER FK | Links to income_entries |
| personal | REAL | Personal cut |
| savings | REAL | Savings amount |
| emergency | REAL | Emergency fund amount |
| bills_pool | REAL | Total directed to bills |
| discretionary | REAL | Leftover after bills |
| total_bills_covered | REAL | Sum actually funded to bills |

### `bill_contributions`
One row per bill per shift allocation, plus manual contributions.

| Column | Type | Description |
|---|---|---|
| expense_id | INTEGER FK | |
| income_entry_id | INTEGER FK | -1 for manual entries |
| amount_funded | REAL | |
| status | TEXT | `'funded'`, `'partial'`, `'unfunded'`, `'manual'` |
| shift_date | TEXT | |

### `buckets`
| Column | Type | Description |
|---|---|---|
| id | INTEGER AUTOINCREMENT PK | |
| name | TEXT | |
| goal_amount | REAL | Optional savings target |
| current_balance | REAL | Running total |
| color | TEXT | Hex color string from palette |

### `bucket_contributions`
| Column | Type | Description |
|---|---|---|
| bucket_id | INTEGER FK | |
| amount | REAL | |
| note | TEXT | Source note (e.g. shift date) |

### `debt_payments`
Manual payments recorded against any tracked debt.

| Column | Type | Description |
|---|---|---|
| debt_name | TEXT | Matches debt name in algorithm |
| amount | REAL | Payment amount |
| date | TEXT | ISO date string |

---

## Allocation Algorithm

Every shift runs through `allocate(amount, incomeType, settings, monthlyProgress)`.

### Split percentages
```
20%  →  personal (yours to spend)
15%  →  savings
 5%  →  emergency fund
60%  →  bills pool
```

### Bills pool distribution
The 60% bills pool is distributed across unfunded bills using a **daily accrual model**:

```
dailyRate = stillNeeded / daysUntilDue
```

Bills are sorted by urgency:
1. Overdue bills first
2. Then by priority (Critical → Low)
3. Within same priority, highest daily rate first (most urgent relative to due date)

For each bill in sorted order:
- If pool ≥ full remaining need → fully fund it
- If pool > 0 but < full need → fund as much as possible (up to the full remaining need)
- If pool = 0 → bill is unfunded this shift

**Monthly memory** — `getMonthlyBillProgress()` reads the current month's `bill_contributions` before each allocation so bills already covered are skipped and never overfunded.

**Surplus acceleration** — if any pool remains after the daily contributions, it's directed to the most urgent unfunded bill.

### Debt balance model
- **Promo cards** (CITI, Discover): hardcoded starting balances minus recorded `debt_payments`
- **Student loans**: hardcoded balances minus recorded payments; deferment countdown to Nov 2026
- **Truck loan**: amortization model ($41,951.58 @ 4.99% APR, $676.83/mo, started May 2026) minus recorded extra payments; monthly payment progress bar driven live from Car Payment bill contributions

---

## Getting Started

### Prerequisites
- Node.js v22+
- Expo CLI (`npm install -g expo`)
- Expo Go app on iPhone (for development)

### Install

```bash
git clone https://github.com/yourusername/fundue.git
cd fundue
npm install
```

### Run

```bash
npx expo start
```

Scan the QR code with Expo Go on your iPhone.

### Build for TestFlight

```bash
npx expo build:ios
# or with EAS:
eas build --platform ios
```

---

## Branches

| Branch | Purpose |
|---|---|
| `main` | Personal version — Mauricio's real bills hardcoded, used daily |
| `public` | Future public release — full dynamic onboarding, no hardcoded data |

---

## Roadmap

| ID | Feature |
|---|---|
| ENH-06 | Delete individual history entries (long-press on shift) |
| ENH-10 | Monthly income target indicator on Home screen |
| ENH-12 | Income heatmap calendar in Insights tab |
| ENH-14 | Rename all remaining BudgetOS references to FunDue |
| ENH-15 | Celebration animations — tier 1: haptic, tier 2: confetti + sound, tier 3: full screen |
| ONBOARDING | Full dynamic onboarding — name, pay type, schedule, notification prefs → bill setup → goals setup → `onboarding_complete` flag |
| PUBLIC-01 | Dynamic bills — add, edit, delete bills like savings buckets |
| PUBLIC-02 | Dynamic debts — add, edit, delete debts + log payments |
| PUBLIC-03 | Enhanced buckets — target date, monthly contribution needed, countdown |
| PUBLIC-04 | Freemium model — 5 bills / 2 buckets / 2 debts free, unlimited on premium |
| PUBLIC-05 | RevenueCat — iOS in-app subscription integration |
| PUBLIC-06 | Settings / Profile screen — name, pay type, schedule, notification prefs |
| PUBLIC-07 | Badge system — milestone badges for savings goals, debt payoffs, streaks |
| PUBLIC-08 | Streak system — consecutive shift-logging streaks with visual rewards |
| PUBLIC-09 | Push notifications — bill due reminders, streak nudges, goal milestones |
| PUBLIC-10 | Spanish localization — full ES translation of all UI strings |
| PUBLIC-11 | i18n framework — extensible localization system for additional languages |

---

## Design Principles

- **Zero backend** — all data stays on device, no accounts, no sync
- **Synchronous SQLite** — all DB calls use `db.runSync` / `db.getAllSync`; no async/await in data layer
- **Single file UI** — `App.js` contains everything; no navigation library overhead
- **Dark theme** — `#0a0a0f` background, `#00d4a8` teal accent throughout
- **Correctability** — every manual contribution (bills, buckets, debts) shows a RECENT history with a Remove button so mistakes are always fixable

---

## License

Private — all rights reserved.
