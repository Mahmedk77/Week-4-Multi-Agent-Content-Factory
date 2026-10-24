import "server-only";
import { graph } from "@/graph";
import type { State } from "@/graph/state";
import type { ReviewRequest } from "@/graph/approval";
import { extractTitle } from "@/graph/publisher";
import type { RunError, RunResult, RunStatus, StepName } from "@/lib/run-types";

export function threadConfig(thread_id: string) {
    return { configurable: { thread_id } };
}

// Which pipeline steps have finished, read from state values (works after a refresh, unlike stream events).
export function completedSteps(v: Partial<State>): StepName[] {
    const steps: StepName[] = [];
    if (v.research != null) steps.push("researcher");
    if (v.draft != null) steps.push("writer");
    if (v.critique != null) steps.push("critic");
    // Supervisor rule 4: a failed critique always sends the run to the rewriter once, and only it sets finalDraft before approval.
    if (v.critique?.passed === false && v.finalDraft != null) steps.push("rewriter");
    if (v.approved != null) steps.push("approval");
    if (v.published != null) steps.push("publisher");
    return steps;
}

export function resultFrom(v: Partial<State>): RunResult {
    const text = v.finalDraft ?? v.draft ?? "";
    return { approved: v.approved === true, published: v.published === true, title: extractTitle(text) };
}

export function shortMessage(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err);
    return msg.length > 300 ? msg.slice(0, 300) + "…" : msg;
}

// An abort (client closed the tab) is not a real failure: the run just stopped and can continue.
export function isAbort(err: unknown): boolean {
    const e = err as { name?: string; message?: string } | null;
    return e?.name === "AbortError" || /abort/i.test(e?.message ?? "");
}

// Reads the checkpoint for one thread and classifies it for the UI.
export async function getRunStatus(thread_id: string): Promise<RunStatus> {
    const snap = await graph.getState(threadConfig(thread_id));
    const v = snap.values as Partial<State>;
    if (!v.topic) return { status: "not_found" };

    const base = { thread_id, topic: v.topic, completed: completedSteps(v) };

    // Graph contract: while paused, snap.next has "approval" and that task's interrupts[0].value is the ReviewRequest.
    const pausedTask = snap.tasks.find((t) => t.name === "approval" && t.interrupts.length > 0);
    if (pausedTask) {
        return { ...base, status: "paused", request: pausedTask.interrupts[0].value as ReviewRequest };
    }

    // Graph contract: a node that threw leaves a task with .error in the snapshot; snap.next still points at it.
    const failedTask = snap.tasks.find((t) => t.error != null && !isAbort(t.error));
    if (failedTask) {
        const error: RunError = { message: shortMessage(failedTask.error), node: failedTask.name };
        return { ...base, status: "failed", error };
    }

    if (snap.next.length > 0) return { ...base, status: "stalled", next: snap.next[0] };

    if (v.approved == null) {
        // Reached END without a human decision: only the iteration guard does this.
        return { ...base, status: "failed", error: { message: "The run stopped early (iteration guard).", node: null } };
    }
    return { ...base, status: "done", result: resultFrom(v) };
}
