# Job Tracker — Archived Product

**Status:** Disconnected from production UI. All code intact. DB data intact.
**Archived:** 2026-06-13
**Branch:** `archive/job-tracker`

---

## What This Was

A personal job application tracker embedded inside the OSS Paths codebase. Users could:

- Browse a curated list of Rust-focused companies (`/companies`)
- Track application status through 13 pipeline stages (Saved → Applied → Interviewing → Offer / Rejected)
- Log recruiter names, salary expectations, applied dates, follow-up dates, and free-text notes
- View a pipeline dashboard with metrics and follow-up queue (`/dashboard`)
- Browse a ranked live job feed powered by HN and CURATED sources (`/opportunities`)
- Read a directory of Rust job sources (`/sources`)

---

## Current State (post-archive)

The tracker routes still exist in the codebase. They are not linked from any public navigation. Redirects in `next.config.ts` send the following URLs to `/`:

- `/companies` → `/`
- `/dashboard` → `/`
- `/workflow` → `/`
- `/sources` → `/`
- `/demo` → `/`

`/opportunities` is **not** redirected — it remains reachable by direct URL.

---

## Code Location

All tracker code is **physically present** in the main codebase, unchanged:

| Location | Contents |
|----------|----------|
| `app/companies/` | Company workspace grid + detail page |
| `app/@modal/` | Parallel route modal intercept for company peek |
| `app/dashboard/` | Pipeline dashboard + saved/applied redirects |
| `app/workflow/` | How-it-works page |
| `app/sources/` | Job sources directory |
| `app/opportunities/` | Live job feed (still active) |
| `components/workspace-sidebar.tsx` | Full workspace sidebar nav |
| `components/workspace-providers.tsx` | Session + PostHog + command palette provider |
| `components/navbar.tsx` | Dark workspace top bar |
| `components/command-palette.tsx` | ⌘K command palette |
| `components/companies-shell.tsx` | Company grid with client-side filtering |
| `components/app-sidebar.tsx` | Sidebar inside companies-shell |
| `components/advanced-filters.tsx` | Filter panel |
| `components/application-dialog.tsx` | Full tracking form |
| `components/application-row.tsx` | Dashboard pipeline row |
| `components/company-row.tsx` | Company list row with quick-actions |
| `components/company-card.tsx` | Company card view |
| `components/company-peek-panel.tsx` | Sliding peek panel |
| `components/status-badge.tsx` | Pipeline status chips |
| `components/careers-link.tsx` | "View careers" button |
| `components/company-avatar.tsx` | Company avatar with fallback |
| `components/opportunity-row.tsx` | Live job feed row |
| `components/opportunities-shell.tsx` | Opportunities page shell |
| `lib/companies.ts` | Prisma Company + UserCompanyState queries |
| `lib/company-status.ts` | UserCompanyStatus type (13 statuses) |
| `lib/filter-companies.ts` | Client-side filtering logic |
| `lib/opportunities.ts` | Prisma Opportunity queries |
| `lib/score-opportunity.ts` | Opportunity quality scoring |
| `lib/panel-store.ts` | Modal skeleton store |
| `lib/sources.ts` | Static job sources data |
| `actions/company.ts` | Server actions: upsertCompanyState, markChecked, etc. |
| `hooks/use-companies.ts` | Client-side company filter hook |
| `types/index.ts` | CompanyFilters, StatusLabels, TimeFilter, etc. |
| `prisma/seed.ts` | Company table seed data |
| `prisma/migrate-to-state.ts` | Migration script |
| `scripts/fetch-hn-opportunities.ts` | HN opportunity fetcher |
| `scripts/fetch-logos.ts` | Company logo fetcher |

---

## Database

The following PostgreSQL tables contain live data and are **not dropped**:

| Table | Model | Data |
|-------|-------|------|
| `companies` | `Company` | Curated Rust company list (~50 rows) |
| `user_company_states` | `UserCompanyState` | Per-user application tracking state |
| `opportunities` | `Opportunity` | HN + curated job listings (fed by admin scanners) |

The 4 auth tables (`users`, `accounts`, `sessions`, `verification_tokens`) remain active for admin authentication.

---

## Admin Pipeline — Unaffected

The admin editorial pipeline continues to operate normally:

- DeepSeek extraction (`lib/admin/deepseek.ts`)
- 8 scanners (`lib/admin/scanners.ts`)
- File-based approval queue (`data/pending/`, `data/rejected/`, `content/`)
- Admin UI (`app/admin/`) — localhost-only, email-gated

Scanners that write to the `Opportunity` table (`fetch-hn-opportunities.ts`) continue to work. The `/opportunities` page continues to serve from that table.

---

## Revival Plan

To extract the tracker into a standalone product:

### Option A — Separate subdomain on same codebase

1. Re-enable redirects removal in `next.config.ts`
2. Re-add navigation CTAs to `components/editorial/editorial-layout.tsx` and `app/page.tsx`
3. Done — the tracker never left the codebase

### Option B — Separate repository

1. `git init jobs.adarshrust.com` (or `tracker.adarshrust.com`)
2. Copy all tracker files listed above into the new repo
3. Copy `prisma/schema.prisma` — keep all models
4. Run `prisma generate` and `prisma migrate deploy` pointing at the existing DB
5. Set env vars: `DATABASE_URL`, `NEXTAUTH_SECRET`, `GITHUB_ID`, `GITHUB_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_POSTHOG_KEY`, `DEEPSEEK_API_KEY`
6. Deploy

### Domain candidates

- `jobs.adarshrust.com`
- `tracker.adarshrust.com`

---

## What Changed to Disconnect the Tracker

Three files were edited. Nothing was deleted.

### `next.config.ts`
Added permanent (308) redirects: `/companies`, `/dashboard`, `/workflow`, `/sources`, `/demo` → `/`

### `components/editorial/editorial-layout.tsx`
Removed the "Job Tracker →" `<Link>` from the nav header and footer block.

### `app/page.tsx`
Removed the "Job Tracker →" `<Link>` from the homepage nav header and footer block.

### `lib/nav-config.ts`
Renamed SITE_NAV entry: `"Companies"` → `"Ecosystem"` (URL `/ecosystem` unchanged).

To fully restore: revert these 4 files.
