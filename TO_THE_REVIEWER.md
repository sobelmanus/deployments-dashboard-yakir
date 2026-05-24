# To The Reviewer

This document summarises the key design decisions made before implementation. Each section explains the choice and the reasoning behind it.

---

## 1. Data loading: server pagination + full client prefetch

The server supports full pagination, filtering, and sorting via query params. On page load, the client fetches page 1 immediately (using any filters already in the URL) to give a fast first paint. It then prefetches all remaining pages in the background — unfiltered, using a larger page size — to build a complete local dataset.

Once prefetch is complete, all filtering and sorting happen entirely in the browser with no further server requests per keystroke or filter change. This is an intentional trade-off: at thousands of records (not millions), a full client-side dataset is acceptable and makes the filtering experience feel instant.

During prefetch, filters and sort remain interactive — changes trigger server requests (same paginated API) rather than disabling the UI. Once prefetch completes, the client silently switches to local filtering.

---

## 2. Client state: rawData + viewData

The frontend maintains two layers of state:

- **`rawData`** — the full, unfiltered dataset as it arrives from the server. Source of truth.
- **`viewData`** — derived from `rawData` by applying the current search chips, enum filters, sort, and delete-toggle. Recomputed whenever `rawData` or any filter/sort state changes.

Mutations (inline edits, deletes, restores) update `rawData` directly; `viewData` follows automatically.

---

## 3. Field config collection

A `field_config` MongoDB collection is the single source of truth for all known fields — both system fields (fixed schema) and custom attribute keys (user-defined). The API returns them split into two properties (`system` / `custom`) which directly mirrors the two-section layout in the column picker and chip search dropdown.

System fields are seeded at startup. Custom fields are registered automatically when a user saves a new attribute key in the detail panel. The seed script pre-populates `field_config` with all custom keys found in existing documents.

---

## 4. Staleness: delta re-fetch, not SSE

Rather than WebSockets or SSE (explicitly out of scope), the client polls for changes using a **delta re-fetch** every 15 seconds: `GET /deployments?updated_since=<lastFetchedAt>`. The server returns only records modified since that timestamp — typically very few in a 15-second window. Every write operation (edit, delete, restore) bumps `updated_at` to ensure it is captured.

A full re-fetch runs every 5 minutes to catch edge cases (e.g. records that expired past the 30-day hard-delete window and silently disappeared from the API).

Background re-fetches never interrupt in-progress inline edits. If a re-fetch arrives while a field is being edited, the incoming value for that field is discarded — the user's in-flight value wins.

The staleness threshold is configurable via environment variable (default: 15 seconds).

---

## 5. Inline editing: optimistic; detail panel save: non-optimistic

**Inline editing** (name and description from the list row) uses optimistic updates: `rawData` is updated immediately and a continuous green cell highlight signals the in-flight PATCH. On error the cell flashes red and `rawData` reverts. No action is taken if the value is unchanged.

**Detail panel save** is non-optimistic: the Save button shows a loading state and the UI waits for server confirmation before updating `rawData`. The panel stays open on error. This asymmetry reflects the difference in risk: a single-field revert is simple; reverting a complex multi-key attributes change is not.

---

## 6. Two PATCH endpoints, different semantics

Editing is split across two endpoints to keep semantics clear:

- **`PATCH /deployments/{id}`** — granular dot-notation update used by inline editing: `{ "attributes.name": "value" }`. Server applies as `$set`, touching only the specified field.
- **`PUT /deployments/{id}`** — full attributes replacement used by the detail panel save: `{ "attributes": { ... } }`. Server applies as `$set: { attributes: {...} }`, replacing the entire sub-object.

This maps to standard REST conventions (PATCH = partial, PUT = full replacement) and avoids ambiguity in the server's update logic.

---

## 7. Soft delete: query-time 30-day expiry

Deleted records are soft-deleted via a `deleted_at` timestamp. The 30-day expiry boundary is enforced at **query time** on every API request (`deleted_at < now - 720 hours`) rather than via a background cleanup job. This keeps the implementation simple and always accurate, with no risk of an expiry window gap. The cost is a minor per-query filter — acceptable at this scale and covered by a `deleted_at` index.

---

## 8. Concurrent edits: last-write-wins

No conflict detection or locking. The last write at the field level wins. This is an explicit, deliberate decision for an internal tool at this scale. The 15-second staleness window reduces the collision window; occasional overwrites are accepted as an edge case.

---

## 9. URL state

All filter, sort, search chip, delete-toggle, and open-panel state is encoded in the URL query string so any view is bookmarkable and shareable.

Filter/sort changes use `history.replaceState` to avoid cluttering browser history. Opening the detail panel uses `history.pushState` so the back button naturally closes it.

Search chips are encoded as repeatable `search=fieldPath:value` params, split on the first `:` to allow colons in values.
