# SHA-VERSE — Full Engineering Audit (Read-Only Documentation)

No source code will be modified, refactored, deleted, or re-installed. The only output is one audit document written to the artifacts folder (`/mnt/documents/SHA-VERSE-Full-Audit.md`), plus a summary in chat.

Rule applied throughout: anything that cannot be verified directly from the repository will be written as **"Not confirmed from the current codebase"** — no guessing.

## What the audit will cover

1. **Project & architecture overview** — stack, entry points (`index.html` → `src/main.tsx` → `src/App.tsx`), routing map, Capacitor/native layer, build config.
2. **Folder-by-folder tree** — purpose of every directory and major file, with an Active / Legacy / Experimental / Unused classification. Includes the two parallel trees found at root: `omnihub-suite-main/` (18 MB, appears to be a full second copy of the app) and `remotion/` (video renderer), each verified for whether the live app imports from them.
3. **Duplication audit** — duplicate folders, pages, components, hooks, services, types, constants, contexts, routes, configs, assets and dependencies. Every duplicate gets: location, why it exists, still referenced or not, merge/delete recommendation, and breakage risk.
4. **Unused-code audit** — orphan files, components, hooks, utils, types, assets, routes, edge functions, npm packages, dead docs/markdown files, debug code and logs. Detected by import-graph traversal from the real entry points, not by eyeballing.
5. **Dependency audit** — every entry in `package.json`: who imports it, necessary or not, duplicates/conflicts (e.g. multiple PDF/EPUB or media stacks), removal risk.
6. **Bookshelf deep documentation** — the full walkthrough you asked for: Bookshelf → library → categories → search → filters → book detail → reader → settings → bookmarks → highlights → notes → progress → PDF mode → reflow mode → extraction → OCR → caching → pagination → virtualization → themes → offline → close. Screen by screen, component by component, prop by prop, button by button (handler, state, hook, table touched), hook by hook (inputs, outputs, deps, side effects).
7. **Reader engine architecture** — `src/lib/reader/*` (types, extract, quality, sanitize, ocr, cache, settings) and `PaginatedReader.tsx`: extraction pipeline, paragraph/heading detection, image + scanned-page handling, quality heuristics, anchoring, caching/versioning. Each algorithm gets a "why it exists" note.
8. **Backend map** — tables, RPCs, storage buckets, edge functions, auth, realtime channels and RLS posture actually referenced by client code; plus tables that exist in the database but have no client usage.
9. **Performance report** — virtualization, lazy routes, memoization, IndexedDB, media compression, and concrete bottlenecks with file:line evidence.
10. **Security report** — current posture (cross-checked against `docs/SECURITY_POLICY.md`), unused permissions/secrets, and anything that looks exposed. Findings only, no fixes.
11. **Project health scorecard** — every module (Home, Movion, Bookshelf, Groups, Profile, NovaChat, Chats, Ads, Backend, Build/Native) rated 1–10 with justification.
12. **Delete candidates** — dedicated table: item, reason, dependents, risk level (Low/Medium/High), impact if removed. Listed only, nothing removed.
13. **Final project map** — folder tree, module dependency tree, route map and data-flow diagrams in ASCII.

## Technical approach

- Build a real import graph from `src/main.tsx` and `src/App.tsx` across `src/**` to classify reachable vs orphan files; do the same independently for `omnihub-suite-main/**`.
- Cross-reference `package.json` entries against actual `import` statements to flag unused/duplicated deps.
- Query the backend read-only (schema, policies, function list) to compare declared tables against tables referenced in client code.
- Every claim in the document carries a `path:line` reference or is explicitly marked as unconfirmed.

## Deliverable

Single markdown document at `/mnt/documents/SHA-VERSE-Full-Audit.md`. Because of the depth requested (especially Bookshelf), it will be written in sequential passes and appended until complete — expect a large file (comparable to or larger than the earlier 2,100-line master doc). Chat reply will summarize the top findings and the delete-candidate list.
