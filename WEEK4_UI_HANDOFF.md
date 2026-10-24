# Week 4 UI Handoff: LangGraph Multi-Agent Content Factory

For Claude Code. The graph (backend) is DONE and tested. Your job is the UI layer: API routes with SSE streaming, a React review screen, and two list pages. Read this whole file before writing code.

---

## 0. Rules (read first)

- **Do not modify anything in `src/graph/`** except `src/graph/checkpointer.ts` (one change, see section 7). The graph logic was built step by step by the owner and is verified.
- **Never touch `week-1`, `week-2`, `week-3`** (sibling folders, read-only history).
- **Secrets are server-only.** `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_URL` must never appear in client code or in a `NEXT_PUBLIC_` variable. Never import `@/graph` from a client component. Never print or log env values.
- **Do not read or print `.env.local` values.** Only the variable names matter (section 2).
- **Verify graph API shapes against the installed package** (`node_modules/@langchain/langgraph`, v1.4.18) before relying on them. Do not trust memory or docs.
- Keep the code simple and readable. Add a short comment wherever code touches the graph contract (stream chunk shapes, resume, thread_id). The owner is learning the architecture and will review those spots.
- The owner is on **Windows / PowerShell**. Use PowerShell-compatible commands in anything you tell him to run.

---

## 1. Project facts

- Root: `D:\AI_Automation_Roadmap\repos\projects\week-4`
- Next.js App Router, TypeScript, `src/` directory, `@/` alias (works with tsx too).
- Run a script: `npx tsx --env-file=.env.local scripts/<file>.ts`. Type-check: `npx tsc --noEmit`.
- Installed: `@langchain/langgraph` 1.4.18, `@langchain/langgraph-checkpoint-postgres` 1.1.2, `@supabase/supabase-js` ^2.118.0, `pg` ^8.23.1, `zod`.
- Env var NAMES in `.env.local` (git-ignored): `GROQ_API_KEY`, `GROQ_MODEL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `TAVILY_API_KEY`, `LANGSMITH_TRACING`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` (session pooler, port 5432).
- Scripts that already exist and work (use them as references, do not edit): `scripts/run-graph.ts` (full run: `npx tsx --env-file=.env.local scripts/run-graph.ts "<topic>" approve|reject`), `scripts/check-approval.ts`, `scripts/check-rewrite.ts`, `scripts/check-critic.ts`, `scripts/check-supervisor.ts`, `scripts/setup-checkpointer.ts` (already run once).

---

## 2. What the graph does (architecture)

Hub-and-spoke: every worker returns to a rule-based supervisor. The supervisor is a pure function of state (no LLM). Nodes write state; edges only route.

```
START -> supervisor -> [researcher | writer | critic | rewriter | approval | publisher | END]
every worker -> supervisor
```

Supervisor rules (checked in order, first match wins; `src/graph/supervisor.ts`):

| # | Condition | Goes to |
|---|---|---|
| 1 | no `research` | researcher |
| 2 | no `draft` | writer |
| 3 | no `critique` | critic |
| 4 | critique failed AND no `finalDraft` yet | rewriter (runs at most once) |
| 5 | `approved == null` | approval (human gate) |
| 6 | `approved != null` AND `published == null` | publisher |
| - | nothing matches | END |

Loop guard: `iterations > 10` ends the run; `recursionLimit: 25` is the backstop.

### Normal path
```
research -> write -> critique -> (rewrite once, only if the critic found factual errors)
         -> approval node PAUSES for a human -> publisher -> END
```

### Design decisions already made (do not redesign)
- The critic checks **factual errors only** (against the research notes). `passed` is computed in code: `passed = no factual errors`. Style suggestions are `styleNotes` and never block.
- **One automatic rewrite at most.** There is NO critic/rewriter loop, and NO "suggest changes to the AI" input for the human.
- The human can always **edit the draft text manually** (free, no AI) and then **Approve** or **Reject**.
- Reject does not loop back. The graph ends and the publisher saves the (possibly edited) text as a **draft**. Approve saves it as **published**.

### State (`src/graph/state.ts`)
`topic`, `research` ({summary, keyFindings, sources: {title,url}[]}), `draft`, `critique` ({score, issues[], styleNotes[], passed}), `finalDraft`, `approved` (boolean|null), `published` (boolean|null), `messages`, `iterations`.
Unwritten channels are `undefined` at runtime (not `null`). Always check with `== null`, not `=== null`.
`finalDraft ?? draft` is always the newest text. `critique` describes the FIRST draft (the rewriter does not clear it), so label it "Issues found in the first draft" in the UI.

### Node files (`src/graph/`)
- `researcher.ts`: LLM writes 3 queries, Tavily searches in parallel, notes synthesized.
- `writer.ts`: writes the post from the notes only; code appends a `## Sources` list.
- `critic.ts`: fact-check vs notes; returns `{score, issues, styleNotes, passed}`.
- `rewriter.ts`: fixes the critic's issues; code re-appends Sources.
- `approval.ts`: calls `interrupt()`; applies the human's edit; sets `approved`.
- `publisher.ts`: upserts one row into Supabase `posts` (keyed on `thread_id`); sets `published`.
- `supervisor.ts`, `state.ts`, `model.ts` (`invokeStructured`, currently OpenAI only), `checkpointer.ts` (PostgresSaver singleton, schema `langgraph`), `index.ts` (exports compiled `graph`).

---

## 3. Graph contract for the UI

```ts
import { graph } from "@/graph";
import { Command } from "@langchain/langgraph";
```

**Start a run**
```ts
const config = { configurable: { thread_id }, streamMode: "updates" as const, recursionLimit: 25 };
for await (const chunk of await graph.stream({ topic }, config)) { ... }
```
- `thread_id` is generated on the server (`randomUUID()`) and returned to the client first. It is the key for everything: checkpoints, resume, and the `posts` row.
- Each chunk is `{ [nodeName]: partialUpdate }`. Node names: `supervisor, researcher, writer, critic, rewriter, approval, publisher`. Hide `supervisor` in the UI progress list.

**The pause (human gate)**
- When the approval node hits `interrupt(request)`, the stream yields a chunk with the key `"__interrupt__"` (the constant `INTERRUPT` is exported by the package). Its value is an array; each item has `.value` = the review request. After that chunk the stream simply ends. **A pause is not an error.**
- Review request shape (`ReviewRequest`, exported from `src/graph/approval.ts`):
  `{ draft: string, critique: { score, issues: string[], styleNotes: string[], passed: boolean } | null }`
- Confirm the exact chunk shape against the installed package before coding. In the existing CLI script it prints as `[__interrupt__] -> 0` (an array).
- After the pause, `graph.getState({configurable:{thread_id}})` has `.next` containing `"approval"`. (Optional: to restore the review screen after a page refresh, the pending request can be read from the state snapshot's tasks/interrupts. Verify the shape first; skip if unclear.)

**Resume**
```ts
graph.stream(
  new Command({ resume: { action: "approve" | "reject", editedDraft?: string } }),
  config, // SAME thread_id
)
```
- Must be a `Command`, with the SAME `thread_id`. Passing a plain object starts a new run instead. Resuming a thread that is not paused does nothing and raises no error.
- The payload is validated by Zod inside the graph (`action` must be "approve" or "reject"; a bad payload throws a ZodError and the thread stays paused). Validate the HTTP body yourself first and return 400.
- Resume stream yields `approval`, `supervisor`, `publisher`, `supervisor`, then ends.

**After the run ends**
`graph.getState(...).values.approved` (boolean) and `.published` (boolean).

---

## 4. Database

### Table `public.posts` (already created, service role only; RLS enabled, no policies)
`id uuid`, `thread_id text UNIQUE`, `title text`, `content text`, `research_sources jsonb` (array of {title,url}), `status text` ('published' | 'draft'), `published_at timestamptz` (only set when published), `created_at timestamptz`.
- The publisher upserts on `thread_id`, so retries never create a second row.
- Anon key cannot read `posts` (RLS on, no policy). **All reads must go through server routes using the service role key.**

### Schema `langgraph` (checkpoint tables, created by `PostgresSaver.setup()` already)
Separate schema so it is not exposed by Supabase's API. Do not touch these tables.

---

## 5. Routes to build

1. **`POST /api/runs`** body `{ topic: string }` (validate: non-empty, trimmed, max ~200 chars).
   - Generates `thread_id`, returns an SSE stream:
     - `event: thread` data `{ thread_id }` (first)
     - `event: node` data `{ name }` for each finished node except supervisor
     - `event: interrupt` data `{ request }` when the pause chunk arrives (then end the stream)
     - `event: error` data `{ message }` on failure (then end the stream)
2. **`POST /api/runs/[id]/review`** body `{ action: "approve"|"reject", editedDraft?: string }` (Zod, return 400 on invalid).
   - Resumes thread `[id]`, SSE events: `node`, then `done` data `{ approved, published }` (read from `getState` after the stream ends), or `error`.
3. **`GET /api/posts?status=published|draft`**: server-side Supabase client with the service role key; returns rows (id, title, content, research_sources, status, published_at, created_at) newest first.

### SSE rules (known failure modes)
- `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"` on both streaming routes (`pg` does not run on the edge runtime).
- Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no` (stops proxy buffering).
- Build the response from a `ReadableStream`; close the controller in a `finally`; stop reading when `request.signal` aborts. The run is checkpointed, so an aborted client can resume later.
- SSE frame format: `event: <name>\ndata: <json>\n\n`.
- **The browser client must use `fetch` + `response.body.getReader()` (and a TextDecoder) to parse frames. `EventSource` cannot be used: it only supports GET, and these routes are POST.** Handle frames split across chunks (buffer until `\n\n`).
- A graph run can take tens of seconds. For deployment later, set `export const maxDuration` appropriately; for local dev nothing is needed.

---

## 6. UI spec (keep it minimal; Tailwind only if already installed)

- **Home (`/`)**: topic input + Start button. A live progress list that ticks off nodes as `node` events arrive (researcher, writer, critic, rewriter if it runs, approval). Show a clear error state on `error`.
- **Review panel** (shown on the `interrupt` event):
  - An **editable textarea** with the draft. It is ALWAYS editable.
  - A read-only box showing the critic's `issues` and `styleNotes`, titled **"Issues found in the first draft"**, plus the score. If `critique` is null, hide it.
  - **Approve** and **Reject** buttons. Both send the current textarea content as `editedDraft`. Disable both buttons after one click (a double click would resume twice; the second resume does nothing and shows no error).
  - NO "suggest changes to the AI" field.
- **Result view** (on `done`): "Approved and published" or "Rejected and saved as a draft", with a link to the right list page.
- **`/published`** and **`/drafts`**: list rows from `/api/posts`, showing title, date, research source count, and expandable content.

---

## 7. The one allowed change in `src/graph/checkpointer.ts`

Next dev hot reload re-imports modules, which would open a new `pg` pool each time (symptoms: "too many connections" / pooler errors). Cache the saver on `globalThis`. Keep the exported names unchanged: `getCheckpointer()` and `closeCheckpointer()`.

Current file (for reference):
```ts
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
let saver: PostgresSaver | undefined;
export function getCheckpointer(): PostgresSaver {
  if (!saver) {
    const url = process.env.SUPABASE_DB_URL;
    if (!url) throw new Error("Checkpointer: SUPABASE_DB_URL is missing");
    saver = PostgresSaver.fromConnString(url, { schema: "langgraph" });
  }
  return saver;
}
export async function closeCheckpointer() { await saver?.end(); saver = undefined; }
```
Do NOT use the transaction pooler (port 6543). The connection string uses the session pooler on 5432.

---

## 8. Known quirks (do not "fix" in the UI)

- **Glued words** appear occasionally in LLM text (e.g. `panelsstand`, `particularlybeneficial`). Cause not yet known. A temporary diagnostic log (`[writer] non-ASCII chars: ...`) was added to `writer.ts`; the owner will investigate later. Do not try to repair text in the UI.
- The critic can be lenient (it may miss an unsupported number) or give 10/10 to a vague draft. That is expected; the human gate is the backstop.
- When the critic passes, the rewriter never runs and `finalDraft` is unset until the approval node copies the current text into it. The review request's `draft` is always `finalDraft ?? draft`.
- `model.ts` currently uses OpenAI only (Groq is temporarily disabled because of free-tier rate limits).

---

## 9. Acceptance tests (run these manually and report results)

1. **Happy path:** start a run, watch nodes tick, review screen appears, click Approve. A `posts` row appears with `status = published`, a correct title (first `# ` line), and `research_sources` filled.
2. **Reject with edit:** start a run, edit the textarea (add a marker like `EDITED`), click Reject. Row has `status = draft`, `published_at` empty, and the content contains the marker.
3. **Double click:** click Approve twice fast. Only one row exists (upsert) and the UI shows one result.
4. **Bad body:** `POST /api/runs/<id>/review` with `{"action":"maybe"}` returns 400.
5. **Persistence (important):** start a run, wait for the review screen, **stop and restart `next dev`**, then Approve using the same thread. It must still work (state is in Postgres). If the UI loses the review request after a refresh, restore it from the state snapshot or show a clear message.
6. **No secret leak:** search the built client bundle / client files for `SERVICE_ROLE` and `SUPABASE_DB_URL`. There must be no matches.
7. `npx tsc --noEmit` is clean.

---

## 10. Out of scope (the owner does these later, back in his planning chat)

LangSmith trace verification, failure-injection tests, the glued-words investigation, cleanup items (researcher source prompt, Groq retry logic), and the weekly CEO update.

When you finish, give a short summary: files created, any deviation from this spec with the reason, and the results of each acceptance test.
