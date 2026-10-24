# UI Design Spec: Draftloom (Content Factory)

> ## READ THIS FIRST: this is inspiration, not a build target
> The files in `design/screens/` are **mockups made for inspiration**. They are static HTML in a custom format (`<x-dc>`, `<sc-if>`, `<dc-import>`), not production code.
> - **We are rebuilding the whole UI from scratch** in the Next.js app. Do not copy the mockup files, their tags or their structure into `src/`.
> - **The design will change as we go.** Layout, colors, copy and even screens are all open. When the owner asks for something different from this spec, the owner wins. Do not defend the mockup.
> - Use this spec for the *ideas*: the pipeline visual, the review layout, the honest "first draft" critic label, the states worth handling. Take what's useful, drop what isn't.
> - The backend contract in `WEEK4_UI_HANDOFF.md` is the source of truth for data and routes. If this spec and the handoff disagree, the handoff wins.

Reference visuals: `design/screens/*.dc.html` (open in a browser to see the markup, tokens are in `base.css`). Screen names are listed in section 3.

---

## 1. Concept

User types a topic. Agents run in order: **Researcher → Writer → Critic → (Rewriter, only if the critic found factual errors)**. The run **pauses** for a human, who edits the draft and chooses **Approve** (published) or **Reject** (saved as draft). No auth, no accounts. Must read clearly in a 60-90 second screen recording without narration.

Look: calm editorial workspace (warm neutral ground, serif for headings and the draft, restrained teal accent) with a CI-style pipeline on the progress screen.

## 2. Design tokens (starting point, change freely)

### Color
| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F5F3EE` | `#141412` | page |
| `--surface` | `#FFFFFF` | `#1D1C19` | cards |
| `--surface2` | `#ECE9E1` | `#272622` | chips, segmented control, score box |
| `--ink` | `#1C1B19` | `#EDEBE4` | text |
| `--muted` | `#645F56` | `#A8A398` | secondary text |
| `--line` | `#DCD7CB` | `#35332D` | borders |
| `--accent` | `#0E6B5E` | `#5FC7B3` | primary button, done state, links |
| `--accent-ink` | `#FFFFFF` | `#082923` | text on accent |
| `--accent-soft` | `#DDEBE7` | `#16332E` | positive tint |
| `--warn` / `--warn-soft` | `#85490A` / `#F5E6CC` | `#E8B56E` / `#322718` | factual issues, connection lost |
| `--danger` / `--danger-soft` | `#A12B2B` / `#F6DFDC` | `#F29A93` / `#3A201E` | errors |

Text and key UI pairs were chosen for 4.5:1 contrast or better. Re-check if you change them.

### Type
- UI: Inter 400/500/600. Headings and rendered draft: Newsreader. Labels, counters, timestamps, markdown editor: JetBrains Mono.
- Scale (px): display 52 · h1 36-40 · h2 20-24 · body 15 · lede 18 · small 13 · mono label 11-12 (uppercase, +0.06em).
- Rendered draft body: Newsreader 18/1.7. Editor: mono 14.5/1.75.

### Space, radius, shadow
- Spacing: 4/8/12/16/24/32/48/72. Page max-width 1120 (lists 920, result 760), side padding 40 (16 on mobile).
- Radius: cards 16, inner panels 12, buttons 10, chips 999.
- Shadow (cards only): `0 1px 2px rgba(0,0,0,.05), 0 8px 24px rgba(0,0,0,.06)` (stronger in dark).
- Min touch target 44px.

## 3. Screens (mockup file → purpose)

| Mockup | Route / state | Notes |
|---|---|---|
| `Main.dc.html` | `/` idle | Topic textarea (max 200, live counter), Start button, "how a run works" strip |
| `Progress.dc.html` | `/` while streaming | **Hero.** Horizontal 5-step pipeline + activity log |
| `Review.dc.html` / `ReviewDark.dc.html` | `/` after `interrupt` | **Hero.** Editable draft + critic panel + decision bar |
| `Result.dc.html` / `ResultDraft.dc.html` | `/` after `done` | Published vs saved-as-draft, equal calm weight |
| `Posts.dc.html` | `/published` (and `/drafts` with posts) | List, one row expanded |
| `PostsEmpty.dc.html` | `/drafts` empty | Empty state |
| `States.dc.html` | various | Run failed, connection lost, saving, submit failed |
| `MobileProgress.dc.html` / `MobileReview.dc.html` | phone width | Vertical pipeline; critic panel is a collapsible drawer under the draft |

Nav: **New · Published · Drafts**, wordmark "Draftloom" (placeholder, fictional).

## 4. Components and states

**Button.** `primary` (accent fill), `secondary` (surface + border), `quiet`. Height 44. States: default, hover, focus-visible (2px accent outline, 2px offset), disabled (60% opacity, `not-allowed`), busy (spinner + "Saving…", `aria-busy`).

**Pipeline step.** States: `pending`, `running`, `done`, `skipped`, `error`, plus `waiting` for the human step.
- pending: outlined dot, muted label.
- running: accent ring + small spinner, pulsing halo (CSS only). No percentage, no timer.
- done: filled accent dot with check.
- skipped: dashed muted dot (used for Rewriter when the critic passed).
- error: danger tint dot with ✕.
- waiting (human step): accent-soft dot, slow breathing opacity.
- Each step shows name, a mono uppercase state word, and a one-line description. Connector line fills accent once the step before it is done.

**Activity log.** One row per finished node: mono timestamp (`m:ss` since Start, from the *client* clock) + "<Agent> finished". The current step shows a spinner row. Honest by construction: it only shows what has really arrived.

**Pipeline summary strip** (review and result screens). Collapsed one-line version of the pipeline with checks; shows "Rewriter ran once" when it ran.

**Critic panel.** Title is fixed: **"Issues found in the first draft"**. Sub-line: "This check ran before the automatic rewrite. The draft on the left was rewritten once, so some issues may already be fixed." Contents: score box (`7 / 10`), "Factual issues" list (warn bullets, count chip), "Style notes" list (muted bullets, count chip). Variants:
- issues listed (default),
- passed with no issues: calm accent-soft message, hide the issue list,
- no critique (`critique == null`): hide the whole panel and let the draft take the full width.
- If the rewriter did **not** run, drop the "rewritten once" sentence.

**Editor card.** Header: "Draft", live word count (mono), segmented control **Edit | Preview**. Edit = textarea (markdown source, mono). Preview = rendered markdown (serif). Always editable. Locked (read-only) while saving.

**Decision bar.** Two buttons, each with a one-line caption beneath.
- Reject (secondary): "Don't publish. Save this version as a draft."
- Approve (primary): "Publish this version."
- Left note: "Your edits are sent with either choice. Nothing is published until you approve."

**Notice.** Banner with icon + title + optional detail. Variants: `danger` (role="alert"), `warn` (role="status"), `ok`.

**Post row.** Title (serif 21, wraps with `overflow-wrap:anywhere`), meta line (date, source count, word count if cheap), 2-line clamped preview, Read/Hide button (`aria-expanded`). Expanded: rendered markdown in a quiet inset panel + sources list (links open in new tab, `rel="noreferrer"`).

**Tabs.** Published | Drafts, as links (route changes), `aria-current="page"` on the active one.

**Empty state.** Icon, short title ("No drafts yet"), one-sentence explanation, one action (Start a run).

## 5. Screen behavior

### Home (idle)
Two columns on desktop (headline left, input card right), stacked on mobile. Start disabled while the input is empty or only whitespace. Counter updates live. Submitting moves the same page into the progress view (no navigation).

### Progress (streaming)
1. On submit show the topic as the page title and render all 5 steps. Researcher is `running` immediately (we know it is first).
2. Each `node` event marks that step `done` and moves `running` to the next step in order.
3. **The server only reports completed steps.** "Running" is therefore *inferred* as the step after the last completed one. Never show a percentage or an ETA.
4. The `rewriter` step stays `pending` ("If needed") until we know. If the next completed node after `critic` is `approval`, mark Rewriter `skipped`. If `rewriter` arrives, mark it `done`.
5. `approval`/`interrupt` → the human step becomes `waiting`, then the page transitions to Review and the pipeline collapses into the summary strip.
6. The pipeline container is `role="status" aria-live="polite"` so screen readers hear each step finish.

### Review
- Desktop: draft card (flexible, min 560) beside critic panel (340-420). They wrap and stack when narrow.
- Mobile: draft first, critic panel as a `<details>` drawer below, decision buttons stacked full width at the end.
- Word count updates on every input.
- On first click of Approve or Reject: disable both buttons, show "Saving…" on the clicked one, make the textarea read-only. A second click must do nothing (the backend would resume twice and the second resume silently no-ops).
- Both actions send the current textarea text as `editedDraft`.
- **No "ask the AI for changes" input.** One automatic rewrite happens in the graph; after that the human edits manually.

### Result
Published: filled accent check, "Approved and published", "This version is now live on the Published page." Draft: neutral document icon, "Saved as a draft", "Not published. Your edited version is saved in Drafts." Both show post title, link to the matching list, and "Start another".

### Lists
Newest first. One component for both routes. Only the first/clicked post is expanded; expanding is client-side (content is already in the list response). Date label is "Published <date>" or "Saved <date>" (use `published_at` or `created_at`).

### Error and edge states
- **Run failed** (`error` event): mark the failing step `error` (the step after the last completed one), show the server message in mono, button "Try again" (starts over with the same topic).
- **Connection lost** (stream ended with no `interrupt`, `done` or `error`): warn notice "Connection lost. The run is saved on the server. Reconnect to pick it up where it stopped." **Needs new work:** resuming from the UI requires a way to read thread state. Treat the Reconnect button as optional/future.
- **Review submit failed**: keep the edited text on screen, re-enable both buttons, show "Couldn't save your decision. Your edits are still in the draft. Nothing was lost."
- Very long title / draft: titles wrap, previews clamp, textarea scrolls. Check these.

## 6. Microcopy (exact strings used in the mockup)

- Home: eyebrow "Multi-agent content factory" · H1 "From a topic to a reviewed post, with you in the loop." · lede "Specialist agents research, write and fact-check a draft. Then the run stops and waits for you. Nothing is published until you approve it." · label "What should the post be about?" · placeholder "e.g. How solid-state batteries could change electric cars" · button "Start run" · note "A run usually takes under a minute. You'll see each agent finish as it happens."
- Step descriptions: Researcher "Searched the web and wrote notes." / Writer "Drafted the post from the notes." / Critic "Fact-checking the draft against the notes." / Rewriter "Runs only if the critic finds factual errors." / Your review "The run pauses so you can edit and decide."
- Step state words: Done · Working · If needed · Up next · Skipped
- Review: eyebrow "Waiting for your review" · title "Review the draft" · panel title "Issues found in the first draft"
- Buttons: Approve · Reject · Saving… · Try again · Start another · View in Published · View in Drafts
- Result: "Approved and published" / "Saved as a draft"
- Empty (drafts): "No drafts yet" / "When you reject a run, your edited version is saved here instead of being published."
- Errors: "The run failed at the critic" · "Connection lost" · "Couldn't save your decision"

## 7. Responsive

- One breakpoint that matters: **640px**. Below it: side padding 16, display type 38, pipeline switches from a 5-column track to a vertical stepper, review stacks.
- Build desktop layouts with flex-wrap (draft `flex: 999 1 560px`, panel `flex: 1 1 340px`) so they stack by themselves.
- Nav wraps; nav links keep 44px height.

## 8. Accessibility

- Real `<button>`, `<a>`, `<label>` + `<textarea>`. No clickable divs.
- Visible focus ring on everything focusable.
- Pipeline is a live region; status is never color-only (icon + word + color).
- Decision buttons have captions that state the consequence.
- Respect `prefers-reduced-motion` (turn off pulse, spin, breathe).
- Contrast: keep text at 4.5:1+ in both themes.

## 9. Implementation notes for Claude Code

- **Rebuild, don't port.** Use the app's real stack (Next.js App Router, Tailwind is installed). Put tokens in CSS variables (light/dark via `prefers-color-scheme` or a class) and reuse them from Tailwind.
- **SSE client:** `fetch` + `response.body.getReader()` + `TextDecoder`, buffer until `\n\n`. `EventSource` is not usable (POST routes).
- **Event → UI map**
  - `thread {thread_id}` → store id for the review call
  - `node {name}` → mark step done, advance inferred `running`; ignore `supervisor`
  - `interrupt {request}` → `request.draft` fills the editor; `request.critique` fills the critic panel (null → hide panel)
  - `error {message}` → error state
  - review stream: `node`, then `done {approved, published}` → result view
- **Field → UI map**
  - `critique.score` → score box · `critique.issues[]` → Factual issues · `critique.styleNotes[]` → Style notes · `critique.passed` → positive empty state
  - `posts.title` → row title · `published_at`/`created_at` → date · `research_sources.length` → "N sources" · `research_sources[]` → links · `content` → preview and expanded body
- Title for the result card: first `# ` line of the final draft.
- Markdown rendering: one standard library is fine (e.g. `react-markdown`). The draft starts with `# Title` and ends with `## Sources`.
- Word count: split on whitespace, client-side.
- Static vs dynamic: nav, home copy, "how a run works" strip are static. Everything on Progress, Review and Result is driven by SSE state. Lists are fetched from `/api/posts`.
- Don't add features that aren't here (login, run history, settings, notifications, AI feedback box). If one seems needed, flag it to the owner.
- Known quirks to leave alone: occasional glued words in LLM text; do not try to repair text in the UI.

---

## 10. Mobile (locked decisions)

Mobile is a separate, app-style layout (mockups `Mobile*.dc.html`, 390 wide), not a squeezed desktop page. Decisions the owner has locked:

- **Navigation:** fixed bottom tab bar (New · Published · Drafts), active tab gets a soft accent pill. Top bar is wordmark + theme toggle only.
- **New run, "How a run works":** one row of five icon steps (Research, Write, Check, Rewrite, You) with short labels and one line underneath: "Rewrite only runs if the critic finds factual errors." Rewrite is a dashed icon, You is accent-filled. **No horizontal scrolling.**
- **Review decision buttons:** stacked, full width, **Approve on top, Reject below**, no per-button descriptions. One centered line under them: "Not ready? Rejecting saves your version to Drafts."
- **Critic panel on mobile:** a tappable bar under the editor ("2 factual issues / Issues found in the first draft") that opens a **bottom sheet** with the score, factual issues and style notes. Button: "Back to the draft".
- **Result:** centered modal dialog over the dimmed review screen: "Approved and published" (or "Saved as a draft"), post title, "View in Published", "Start another".
- **Published/Drafts list:** the newest post is a larger tinted "Latest" card (3-line preview, "Read" arrow). Older posts sit under an "Earlier" label in one grouped list with dividers and chevrons (title, date, sources, words).
- **Reading a post:** tapping a post opens a near-full-height **bottom sheet** (grabber, status chip, title, meta, scrolling body with bottom fade, footer with "N sources" and "Done"). Dark version exists.
- **Progress:** vertical stepper in a card, finished steps show their time. Spinner only on the running step.

Implementation hints: sheets are `role="dialog" aria-modal="true"` with a visible close button and focus returned to the trigger on close; respect `prefers-reduced-motion` for the slide-up. Keep the tab bar clear of the iOS home indicator (extra bottom padding). Minimum touch target 44px.
- **Sources (mobile):** tapping "N sources" in the reader sheet swaps the sheet's content to a Sources list (no second sheet on top). Header: back arrow, "Sources", "N links · open in a new tab", close. Each row is a link (`target="_blank" rel="noreferrer"`): letter avatar from the domain, source title (2-line clamp), domain in mono, external-link icon, min height 64px. Footer: "Back to the post". Data: `research_sources[]` `{title, url}`; derive the domain from `url`. On desktop the same list can sit under the post body.
