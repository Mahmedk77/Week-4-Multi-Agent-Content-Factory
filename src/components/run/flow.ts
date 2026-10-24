import type { ReviewRequest, RunError, RunEvent, RunResult, RunStatus, StepName } from "@/lib/run-types";

// ---------- State ----------

export type View = "idle" | "loading" | "progress" | "review" | "result" | "not_found";
export type Decision = "approve" | "reject";

export type Flow = {
    view: View;
    topic: string;
    threadId: string | null;
    completed: StepName[]; // finished nodes, in arrival order
    criticPassed: boolean | null; // from the critic's node event; tells us early whether the rewriter will run
    log: { name: StepName; at: number | null }[]; // at = ms since startedAt (client clock); null when restored
    startedAt: number;
    startError: string | null; // POST /api/runs refused (400)
    problem: null | { kind: "failed"; error: RunError } | { kind: "lost" };
    request: ReviewRequest | null;
    draft: string; // the textarea content
    saving: Decision | null;
    submitError: null | { message: string; retrySave: boolean }; // retrySave: decision recorded, only the save failed
    result: RunResult | null;
};

export const initialFlow: Flow = {
    view: "idle",
    topic: "",
    threadId: null,
    completed: [],
    criticPassed: null,
    log: [],
    startedAt: 0,
    startError: null,
    problem: null,
    request: null,
    draft: "",
    saving: null,
    submitError: null,
    result: null,
};

// ---------- Actions ----------

export type Action =
    | { type: "topic"; topic: string }
    | { type: "start"; topic: string; now: number }
    | { type: "startError"; message: string }
    | { type: "continue"; now: number }
    | { type: "loading" }
    | { type: "event"; event: RunEvent; now: number }
    | { type: "lost" }
    | { type: "restore"; status: RunStatus }
    | { type: "edit"; text: string }
    | { type: "submit"; decision: Decision }
    | { type: "submitError"; message: string }
    | { type: "reset" };

export function reducer(f: Flow, a: Action): Flow {
    switch (a.type) {
        case "topic":
            return { ...f, topic: a.topic, startError: null };
        case "start":
            return { ...initialFlow, view: "progress", topic: a.topic, startedAt: a.now };
        case "startError":
            return { ...f, view: "idle", startError: a.message };
        case "continue":
            return { ...f, view: "progress", problem: null, startedAt: a.now, log: [] };
        case "loading":
            return { ...initialFlow, view: "loading" };
        case "event":
            return onEvent(f, a.event, a.now);
        case "lost":
            if (f.view === "review") return { ...f, saving: null, submitError: { message: "The connection dropped before we heard back.", retrySave: false } };
            return { ...f, problem: { kind: "lost" } };
        case "restore":
            return restore(a.status);
        case "edit":
            return { ...f, draft: a.text };
        case "submit":
            return { ...f, saving: a.decision, submitError: null };
        case "submitError":
            return { ...f, saving: null, submitError: { message: a.message, retrySave: false } };
        case "reset":
            return initialFlow;
    }
}

function onEvent(f: Flow, e: RunEvent, now: number): Flow {
    switch (e.event) {
        case "thread":
            return { ...f, threadId: e.data.thread_id };
        case "node": {
            const name = e.data.name;
            if (f.completed.includes(name)) return f;
            return {
                ...f,
                completed: [...f.completed, name],
                criticPassed: name === "critic" ? e.data.passed ?? null : f.criticPassed,
                log: [...f.log, { name, at: now - f.startedAt }],
            };
        }
        case "interrupt": {
            const request = e.data.request;
            const completed = request.rewritten && !f.completed.includes("rewriter") ? [...f.completed, "rewriter" as const] : f.completed;
            return { ...f, view: "review", topic: request.topic, request, draft: request.draft, completed, saving: null, submitError: null, problem: null };
        }
        case "done":
            return { ...f, view: "result", result: e.data, saving: null };
        case "error":
            if (f.view === "review") {
                // A publisher failure means the decision is already recorded: only "retry saving" makes sense.
                return { ...f, saving: null, submitError: { message: e.data.message, retrySave: e.data.node === "publisher" } };
            }
            return { ...f, problem: { kind: "failed", error: e.data } };
    }
}

function restore(s: RunStatus): Flow {
    if (s.status === "not_found") return { ...initialFlow, view: "not_found" };
    const base: Flow = {
        ...initialFlow,
        threadId: s.thread_id,
        topic: s.topic,
        completed: s.completed,
        log: s.completed.map((name) => ({ name, at: null })),
    };
    switch (s.status) {
        case "paused":
            return { ...base, view: "review", request: s.request, draft: s.request.draft };
        case "failed":
            return { ...base, view: "progress", problem: { kind: "failed", error: s.error } };
        case "stalled":
            return { ...base, view: "progress", problem: { kind: "lost" } };
        case "done":
            return { ...base, view: "result", result: s.result };
    }
}

// ---------- Pipeline (derived, never stored) ----------

export type StepKey = "researcher" | "writer" | "critic" | "rewriter" | "review";
// blocked: a step after a failed one (it never got its turn).
export type StepState = "pending" | "running" | "done" | "skipped" | "error" | "waiting" | "unknown" | "blocked";
export type Step = { key: StepKey; state: StepState };

export const STEP_ORDER: StepKey[] = ["researcher", "writer", "critic", "rewriter", "review"];

// Which pipeline step a graph node belongs to (the publisher runs as part of "your review").
export function stepOfNode(node: string | null): StepKey | null {
    if (node === "approval" || node === "publisher") return "review";
    if (node === "researcher" || node === "writer" || node === "critic" || node === "rewriter") return node;
    return null;
}

// Will the rewriter run? true / false, or null while we can't know yet.
export function rewriterRuns(f: Flow): boolean | null {
    if (f.completed.includes("rewriter")) return true;
    if (f.request) return f.request.rewritten;
    if (f.criticPassed != null) return !f.criticPassed;
    if (f.completed.includes("approval")) return false;
    return null;
}

export function pipeline(f: Flow): Step[] {
    const done = new Set<string>(f.completed);
    const rewrites = rewriterRuns(f);

    const steps: Step[] = STEP_ORDER.map((key) => {
        if (key === "review") {
            if (done.has("approval")) return { key, state: "done" };
            if (f.view === "review") return { key, state: "waiting" };
            return { key, state: "pending" };
        }
        if (done.has(key)) return { key, state: "done" };
        if (key === "rewriter" && rewrites === false && done.has("critic")) return { key, state: "skipped" };
        return { key, state: "pending" };
    });

    // The server only reports finished steps, so "running" is inferred: the first step that is not finished.
    const active = steps.find((s) => s.state === "pending");
    if (f.view !== "progress" || !active) return steps;

    if (f.problem?.kind === "failed") {
        const target = stepOfNode(f.problem.error.node) ?? active.key;
        const at = STEP_ORDER.indexOf(target);
        return steps.map((s, i) => {
            if (s.key === target) return { ...s, state: "error" };
            if (i > at && s.state === "pending") return { ...s, state: "blocked" };
            return s;
        });
    }
    if (f.problem?.kind === "lost") return steps.map((s) => (s === active ? { ...s, state: "unknown" } : s));
    return steps.map((s) => (s === active ? { ...s, state: "running" } : s));
}
