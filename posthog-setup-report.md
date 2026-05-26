<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into jobs.adarshrust.com. The project already had a partial PostHog setup; this integration extended it significantly — migrating initialization to `instrumentation-client.ts` (the recommended Next.js 15.3+ approach), adding 7 new event types, and wiring captures across 5 files. A PostHog dashboard with 5 targeted insights was created to monitor the full job-application pipeline.

## Changes made

### New files
- **`instrumentation-client.ts`** — PostHog client-side initialization using the Next.js 15.3+ `instrumentation-client` hook. Enables `capture_exceptions` for automatic error tracking. Replaces the `useEffect`-based init that was previously inside `PostHogProvider`.
- **`components/careers-link.tsx`** — Thin client component wrapping the "Careers page" button on the company detail page, so click events can be captured from a server-rendered page.

### Modified files
- **`components/posthog-provider.tsx`** — Removed the `posthog.init()` call (now handled by `instrumentation-client.ts`). Kept the `PHProvider` wrapper, `PageViewTracker`, and `UserIdentifier` as-is.
- **`lib/analytics.ts`** — Added 5 new entries to the `AppEvent` typed union (`company_saved`, `company_unsaved`, `company_applied_quick`, `company_viewed`, `careers_page_clicked`). Removed a hardcoded host fallback.
- **`components/advanced-filters.tsx`** — Captures `preset_applied` (with `preset_name`) when a quick-filter preset is clicked.
- **`components/company-row.tsx`** — Captures `company_saved`, `company_unsaved`, `company_applied_quick`, and `careers_page_clicked` (from both desktop and mobile rows).
- **`components/company-card.tsx`** — Same four events as company-row for the grid card view.
- **`app/companies/[slug]/page.tsx`** — Captures server-side `company_viewed` for authenticated users; uses `<CareersLink>` for the careers button.

## Event catalogue

| Event | Description | File |
|---|---|---|
| `sign_in` | User signs in via GitHub or Google | `lib/auth.ts` *(pre-existing)* |
| `company_tracked` | User saves application state via the full dialog (new or updated) | `components/application-dialog.tsx` *(pre-existing)* |
| `company_untracked` | User removes a company from their pipeline via the dialog | `components/application-dialog.tsx` *(pre-existing)* |
| `filter_applied` | Debounced capture after user adjusts any filter | `components/companies-shell.tsx` *(pre-existing)* |
| `preset_applied` | User clicks a quick-filter preset (e.g. "Active pipeline") | `components/advanced-filters.tsx` |
| `company_saved` | User bookmarks a company via the quick-save button | `components/company-row.tsx`, `components/company-card.tsx` |
| `company_unsaved` | User removes a company bookmark | `components/company-row.tsx`, `components/company-card.tsx` |
| `company_applied_quick` | User marks a company as applied via the inline "Apply" button | `components/company-row.tsx`, `components/company-card.tsx` |
| `company_viewed` | Authenticated user opens a company detail page (funnel top) | `app/companies/[slug]/page.tsx` |
| `careers_page_clicked` | User opens an external careers page link | `components/company-row.tsx`, `components/company-card.tsx`, `components/careers-link.tsx` |

## Next steps

We've built a dashboard and 5 insights to monitor user behavior:

- **Dashboard**: [Analytics basics](/dashboard/1632514)
- **Sign-in → Company Tracked Conversion** (funnel): [/insights/HfBkMutJ](/insights/HfBkMutJ)
- **Daily Pipeline Actions** (trends): [/insights/SZZHa1FZ](/insights/SZZHa1FZ)
- **External Application Intent (Careers Clicks)** (trends by source): [/insights/Kf2KomyJ](/insights/Kf2KomyJ)
- **Filter & Preset Discovery** (trends): [/insights/wbo29zRK](/insights/wbo29zRK)
- **Company Viewed → Tracked (Detail Page Funnel)**: [/insights/wV7CAc1g](/insights/wV7CAc1g)

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
