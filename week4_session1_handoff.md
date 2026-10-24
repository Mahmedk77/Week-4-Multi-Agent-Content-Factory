# Handoff Prompt: Week 4, Session 1 (Multi-Agent Content Factory)

Paste everything below the line into Claude Code, run from the empty `week-4` project folder.

---

## Goal (this session only)

Scaffold the project and build: **StateGraph shape + Supervisor + Researcher**, runnable from a CLI script with per-node streaming and a LangSmith trace. **No UI work, no other agents.**

Final graph for this session: `START → supervisor → researcher → supervisor → END`

## Context

I'm building a Multi-Agent Content Factory in LangGraph (JS/TS): topic in → Supervisor, Researcher, Writer, Critic, Rewriter → human approval → Publisher. Later sessions add the rest. Design so adding a node later is a small change. I'm learning LangGraph: prefer clear, readable code with short comments explaining *why* over clever abstractions.

Stack: Next.js (App Router, TypeScript), `@langchain/langgraph`, `@langchain/core`, Groq (primary, free tier), OpenAI (fallback), Tavily, Zod, LangSmith.

Read-only reference: `../week-2` (how I set up Groq + Tavily there). **Do not modify anything outside this folder.**

## Setup

- `create-next-app` (TypeScript, App Router, src dir). Leave the default page untouched.
- Install current versions of the packages above. Use whichever Tavily package is current for the installed LangChain version (`@langchain/tavily` vs `@langchain/community`). **Report exact installed versions.**
- `tsx` to run scripts. `.env.example` with all keys, `.env.local` git-ignored. Never print keys.
- `git init`, one commit at the end. **Do not push.**

## Structure

```
src/graph/state.ts          // state definition + types
src/graph/supervisor.ts     // routing function + supervisor node
src/graph/researcher.ts     // researcher node
src/graph/models.ts         // getModel(): Groq primary, OpenAI fallback
src/graph/checkpointer.ts   // getCheckpointer(): MemorySaver for now
src/graph/index.ts          // builds + compiles the graph
scripts/run-graph.ts        // CLI runner (see Verification)
scripts/failure-tests.ts    // deliberate failure cases (see below)
```

`getCheckpointer()` must be the **only** place the checkpointer is chosen. In session 3 I swap it for Postgres/Supabase by editing this one file.

## State contract (`state.ts`)

Use LangGraph's current state definition API (Annotation or Zod, whichever is idiomatic for the installed version).

| Field | Type | Reducer |
|---|---|---|
| topic | string | overwrite |
| research | ResearchNotes \| null | overwrite |
| draft | string \| null | overwrite |
| critique | Critique \| null | overwrite |
| finalDraft | string \| null | overwrite |
| approved | boolean \| null | overwrite |
| published | boolean (default false) | overwrite |
| messages | array of messages | **append** (concat) |
| iterations | number (default 0) | overwrite (supervisor increments) |

`iterations` is an addition to my roadmap spec. It's the loop guard. Flag it as a deviation in your report.

`ResearchNotes` (Zod schema, exported):
`{ summary: string, keyFindings: string[], sources: { title: string, url: string }[] }`
`Critique` can be a placeholder type for now. Don't implement it.

## Supervisor

- **Rule-based, no LLM.** Pure function of state.
- Routing table is data, not a nested if: an ordered list of `[condition(state), nodeName]`.
- Session 1 rules: `research` empty → `"researcher"`; otherwise → `END`. Leave a comment marking where writer/critic/rewriter/approval/publisher rules go later.
- Supervisor node increments `iterations` and logs its decision to `messages`. If `iterations` exceeds `MAX_ITERATIONS` (const, 10), route to `END` and log why.
- Also set an explicit `recursionLimit` on invoke/stream config as the backstop behind our own guard.

## Researcher

1. LLM call (structured output) generates **3 distinct search queries** from `topic`.
2. Run the 3 Tavily searches **in parallel** (`Promise.all`).
3. LLM call (structured output, `ResearchNotes` schema) synthesizes results. `sources` must only contain URLs that actually appeared in the Tavily results, not model-invented ones.
4. Return `{ research, messages: [...] }`.

Error handling (implement exactly this, then report what you observed):
- One or two searches fail → continue with the rest, log which failed.
- All searches fail or return nothing → throw a clear `Error("Researcher: no search results ...")`.
- Structured output parse failure → retry once, then fall back to OpenAI (`gpt-4o-mini`). Log which provider produced the result.

`models.ts`: model names from env vars (`GROQ_MODEL`, `OPENAI_MODEL`), defaults matching what I used in Week 2. Groq structured output can be flaky. If default `withStructuredOutput` fails on Groq, try the alternate `method` option before falling back, and tell me which one worked.

## Verification (definition of done)

`scripts/run-graph.ts "<topic>"`:
- Generates a `thread_id`, runs the graph with `streamMode: "updates"`, prints each chunk as `[nodeName] → <keys updated>` (not full dumps).
- After the run, prints final `research.summary`, number of sources, and total `iterations`.
- Then calls `graph.getState({ configurable: { thread_id } })` and prints the values keys, and counts checkpoints via `getStateHistory`. This proves one snapshot per step.
- Prints the LangSmith trace URL/project name. **Verify a trace actually appears** in LangSmith (don't assume env var names; test empirically and tell me which vars worked).

## Failure tests (`scripts/failure-tests.ts <case>`)

Reproduce each on purpose and record the **exact error text and behavior**:

1. `recursion`: force the supervisor to always return `"researcher"`, with our `iterations` guard disabled and low `recursionLimit`. Capture the `GraphRecursionError` message. Then re-enable the guard and show it exits cleanly first.
2. `reducer`: tiny 2-node graph writing `messages`, run once with the append reducer and once without. Show the overwrite.
3. `bad-route`: routing function returns a misspelled node name. Capture the error.
4. `tavily-fail`: invalid Tavily key. Confirm the all-fail path throws the clear error.
5. `groq-fail`: invalid Groq key. Confirm fallback to OpenAI triggers and is logged.

## Do NOT

- Modify `../week-1`, `../week-2`, `../week-3`, or anything outside this folder.
- Build Writer/Critic/Rewriter/approval/Publisher, SSE routes, or any UI.
- Touch Supabase (no schema, no `posts` table, no checkpointer yet).
- Add Vercel config, deploy, or push to a remote.
- Commit secrets or print API keys.
- Add dependencies beyond what's listed without telling me why.

## Report back (this format)

1. **Built:** files created, one line each.
2. **Deviations** from this spec, with reason.
3. **Failure test results:** for each of the 5, exact error text and observed behavior.
4. **Verified:** LangSmith env vars that worked; trace confirmed (yes/no); Groq structured-output method that worked.
5. **Installed versions:** langgraph, langchain core, groq, openai, tavily, zod, next.
6. **API shapes to check before session 2:** how `interrupt()` and resume (`Command`) are exposed in the installed version, and how an interrupt appears in the `updates` stream. Check the installed types or docs; don't guess.
7. **Anything fragile or surprising.**
