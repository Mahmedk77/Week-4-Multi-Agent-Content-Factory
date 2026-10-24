# UI Build Plan (for review)

Goal: build the full design spec (`design/UI_DESIGN_SPEC.md`) on top of the graph, and change the backend where that makes the UI simpler or more honest.

Nothing is built yet. Review this, mark changes, then I start.

---

## 1. Facts I checked in the installed packages

- **Next 16.3.7.** Route handlers use Web `Request`/`Response`, and `params` is a Promise. `runtime = "nodejs"` is the default and `maxDuration` exists. `dynamic = "force-dynamic"` is still valid because Cache Components is off in `next.config.ts`.
- **`server-only`** is built into Next. `import "server-only"` makes the build fail if a client file imports server code. I'll use it on every file that touches secrets or the graph.
- **The pause:** the stream yields `{ __interrupt__: Interrupt[] }`, and `Interrupt.value` is our `ReviewRequest`.
- **Restore after refresh is possible:** `graph.getState()` returns `tasks[]`. Each task has `interrupts[]` (with `.value` = the review request) and `error`. So the server can say "paused, here is the request" or "failed at critic, here is the error" for any thread.
- **No `approval` node event before the pause.** The approval node pauses inside `interrupt()`, so the first stream sends `__interrupt__` instead of `approval`. The UI must use `interrupt` to mark Rewriter skipped, not "the next node is approval".

---

## 2. Backend changes

### 2.1 Graph (`src/graph/`)

| File | Change | Why |
|---|---|---|
| `checkpointer.ts` | Cache the saver on `globalThis`. Keep the existing names `getCheckpointer` / `closeCheckPointer` (the scripts use them). | Hot reload would otherwise open a new pg pool each time. |
| `approval.ts` | Add `topic` and `rewritten: boolean` to `ReviewRequest`. Remove the unused `feedback`, `MAX_HUMAN_ROUNDS` and `MAX_FEEDBACK_CHARS`. | The review screen needs the topic. "Rewriter ran once" must be known from data, not from events (events are lost on refresh). |
| `state.ts` | Remove the unused `Graph` import. | Cleanup. |

The supervisor, the nodes, the prompts and the routing stay exactly as they are.

### 2.2 Server helpers (new, `src/server/`, all `import "server-only"`)

- `runStream.ts`: **one** function used by every streaming route. It runs `graph.stream(input, config)` and turns chunks into our events:
  - `node {name}` for each finished node except `supervisor`
  - `interrupt {request}` on `__interrupt__`
  - `done {approved, published, title}` when the graph reaches END
  - `error {message, node}` on failure. `node` is read from the failed task in `getState()`, so the UI shows exactly where it broke, not a guess.
- `sse.ts`: builds the SSE `Response` (headers from handoff §5, `ReadableStream`, `finally` close, stop on `request.signal` abort).
- `runStatus.ts`: reads a thread's snapshot and returns `{ status, topic, completed[], request?, error?, result? }`. `status` is one of `paused | failed | stalled | done | not_found`.
- `posts.ts`: `listPosts(status)` with the service-role Supabase client.

### 2.3 Routes

| Route | What it does |
|---|---|
| `POST /api/runs` | Body `{topic}` (Zod: trimmed, 1-200 chars, else 400). Sends `thread` first, then the stream. |
| `GET /api/runs/[id]` | **New.** JSON status from `runStatus`. Used to restore the screen after a refresh or a `next dev` restart. |
| `POST /api/runs/[id]/review` | Body `{action, editedDraft?}` (Zod, else 400). **New check:** if the thread is not paused at `approval`, return 409 `"already decided"`. This makes double clicks and stale tabs safe on the server too, not only in the UI. Streams `node`, then `done` / `error`. |
| `POST /api/runs/[id]/continue` | **New.** For a failed or interrupted thread (not paused at review). Runs `graph.stream(null, config)`, which retries from the step that failed and keeps the earlier steps (no new research cost). Returns 409 if there is nothing to continue. |
| `GET /api/posts?status=` | Same as the handoff. |

Why `/continue` matters: without it, "Try approve again" after a Supabase failure does nothing. The thread is past the pause, so a second resume is silently ignored. With it, the UI can retry the publisher properly.

---

## 3. Frontend

### 3.1 Foundation
- **Fonts:** Inter, Newsreader and JetBrains Mono via `next/font/google` (replacing Geist).
- **Tokens:** the spec's colors as CSS variables in `globals.css`, light and dark via `prefers-color-scheme`, mapped into Tailwind with `@theme` (`bg-surface`, `text-muted`, …).
- **Reduced motion:** a `prefers-reduced-motion` block turns off pulse, spin and breathe.
- **New dependencies:** `react-markdown` and `remark-gfm`, for Preview and the expanded posts.

### 3.2 Home flow (`/`, one client component, a reducer as the state machine)
```
idle -> running -> review -> saving -> result
           |          |         |
         failed     (409)    submit-failed -> review again / continue
           |
          lost  (stream ended with no interrupt/done/error)
```
- The thread id goes into the URL (`/?run=<id>`). On load with `?run`, call `GET /api/runs/[id]` and jump to the right screen: review, result, failed (with Retry) or stalled (with Continue).
- **SSE client** (`src/lib/sse.ts`): `fetch` + `getReader()` + `TextDecoder`, buffered until `\n\n`.
- **Pipeline rules:** "running" is the step after the last `node` event. On `interrupt`, Rewriter becomes `done` if `request.rewritten`, else `skipped`. Review becomes `waiting`.
- **Errors:** "Retry from <step>" (calls `/continue`, keeps the earlier work) is the main button, and "Start over" (same topic, new run) is secondary. This changes the spec's single "Try again" button.

### 3.3 Components (`src/components/`)
`Nav`, `Button` (primary/secondary/quiet, busy), `Notice`, `Pipeline` (horizontal; vertical under 640px with the same markup), `ActivityLog`, `PipelineSummary`, `DraftEditor` (Edit/Preview, word count, read-only while saving), `CriticPanel` (issues / passed / hidden; "rewritten once" line only if `rewritten`), `DecisionBar`, `ResultCard`, `PostList` + `PostRow` (expand/collapse), `Tabs`, `EmptyState`, `Markdown`.

### 3.4 Lists
`/published` and `/drafts` are server pages that call `listPosts()` directly (no extra HTTP hop). `GET /api/posts` still exists for the handoff. Expanding a post happens client-side.

---

## 4. Build order

1. Backend: checkpointer, `approval.ts`, server helpers, five routes. Check with PowerShell `Invoke-WebRequest` / `curl.exe` before any UI.
2. Foundation: fonts, tokens, layout, nav, button, notice.
3. Home flow: idle, then progress, then review, then result.
4. Restore and recovery: `?run=`, failed, stalled, submit-failed, 409.
5. Lists and empty state.
6. Polish: mobile (640px), dark mode, focus rings, live regions, long titles and drafts.
7. Acceptance tests (handoff §9) plus new ones: refresh on review, 409 on second review, continue after a stopped run. Then `npx tsc --noEmit`, `npm run lint`, and a secret grep on `.next/static`.

Each real run calls OpenAI and Tavily, so testing costs a little. I expect about 6-8 full runs.

---

## 5. Decisions for you

1. **Keep `closeCheckPointer`** (capital P) as it is? I recommend yes, because the scripts use it.
2. **Retry from the failed step** (`/continue`) as the main error action, with "Start over" second? I recommend yes.
3. **Thread id in the URL** (`/?run=<id>`) for restore? I recommend yes.
4. **Theme:** follow the system light/dark setting only, or also add a toggle? The spec doesn't ask for a toggle, so I'd skip it.

## 6. Not doing (unless you ask)
Run history page, auth, AI feedback box, fixing glued words in the text, a theme toggle, deployment settings.
