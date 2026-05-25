# To The Reviewer

## Running the project

**Prerequisites:** Docker (for MongoDB), Python 3.11+, Node.js 18+.

```bash
# 1. Start MongoDB
docker-compose up -d mongo

# 2. Seed ~5 000 records
cd seed && pip install -r requirements.txt && python seed.py

# 3. Backend (port 8000)
cd backend && pip install -r requirements.txt -r requirements-dev.txt
uvicorn main:app --reload --port 8000

# 4. Frontend (port 3000)
cd frontend && npm install && npm run dev
```

**Tests:**

```bash
# Backend (pytest + mongomock, no real DB needed)
cd backend && pytest

# Frontend unit tests (Vitest)
cd frontend && npx vitest run

# Frontend E2E (Playwright — requires dev server on :3000)
cd frontend && npm run test:e2e
```

---

## Design decisions

- **Server pagination + full client prefetch.** The bootstrap fetch returns page 1 immediately (with any URL filters applied server-side) for a fast first paint, then all remaining pages are fetched in the background. Once complete, all filtering and sorting run entirely in the browser — at ~5 k records this gives instant filter response without overcomplicating the server.

- **`rawData` / `viewData` split.** `rawData` is the unfiltered server dataset (source of truth); `viewData` is derived by applying current filters and sort. Mutations update `rawData` directly and `viewData` follows automatically.

- **`field_config` collection.** A single MongoDB collection owns all known fields (system + custom), returned from the API split into two properties that map directly to the two-section layout in the column picker and chip search dropdown. Custom keys are registered automatically when users save new attributes.

- **Delta re-fetch, not SSE.** The client polls `GET /deployments?updated_since=<ts>` every 15 s (configurable via env var), returning only recently changed records. A full re-fetch runs every 5 minutes to catch records that expired past the 30-day hard-delete window.

- **Optimistic inline edits, non-optimistic detail panel save.** Inline edits (name/description) update the UI immediately and flash red + revert on error — simple to recover from. The detail panel waits for server confirmation before updating state, because reverting a multi-key attributes change is more complex.

- **`PATCH` for inline edits, `PUT` for detail panel.** `PATCH` accepts dot-notation paths (`{ "attributes.name": "value" }`) and applies a granular `$set`; `PUT` replaces the entire `attributes` sub-object. Maps cleanly to REST semantics and keeps server update logic unambiguous.

- **Query-time 30-day expiry.** Soft-deleted records are excluded at query time (`deleted_at < now − 720 h`) rather than via a background cleanup job — simpler, always accurate, and covered by a `deleted_at` index.

- **Last-write-wins.** No conflict detection or locking. The 15-second staleness window keeps the collision window small; occasional overwrites are an accepted trade-off for an internal tool at this scale.

- **URL-encoded state.** All filter, search chip, sort, delete-toggle, and open-panel state lives in the query string for bookmarkability. Filter/sort changes use `replaceState`; opening the detail panel uses `pushState` so the back button closes it naturally.

- **Next.js Server Components not used intentionally.** The app is client-heavy: every component is `'use client'` and data fetching happens in the browser. Next.js SSR/RSC would improve first-paint latency by embedding the initial page of records in the HTML response, but the filtering model requires the full dataset in the browser's memory regardless — Server Components only help with the first render and don't change the interaction model after that. For a public-facing app the split would be worth it; for this internal dashboard the trade-off favours simplicity.

- **Req 4 — in-session vs. tab-discard.** "Reloading all data every time is wasteful" is addressed by URL state persistence and `updated_since` delta polling: returning to the tab within a session costs at most one delta request rather than a full prefetch. The tab-discard case (Chrome evicting a long-backgrounded tab) is not handled — that would require persisting `rawData` to localStorage, which is risky at ~5 k records because the 5 MB quota is tight and cold-cache data would need a staleness check before it could be trusted.
