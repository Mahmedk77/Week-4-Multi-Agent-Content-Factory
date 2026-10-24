import "server-only";
import { INTERRUPT } from "@langchain/langgraph";
import { graph } from "@/graph";
import type { ReviewRequest } from "@/graph/approval";
import type { RunEvent, StepName } from "@/lib/run-types";
import { getRunStatus, isAbort, shortMessage } from "./runStatus";

// What can be fed into the graph: a new run's input ({ topic }), a resume Command, or null (continue from the last checkpoint).
export type GraphInput = Parameters<typeof graph.stream>[0];

// Runs the graph for one thread and turns its stream chunks into our SSE events.
export async function* streamRun(input: GraphInput, thread_id: string, signal: AbortSignal): AsyncGenerator<RunEvent> {
    // Graph contract: same thread_id = same checkpoints. `signal` stops the graph if the browser disconnects.
    // durability "sync": each checkpoint is saved before the stream moves on. With the default ("async") the
    // stream can end before the pause is in Postgres, and a fast review click would see a half-saved run.
    const config = {
        configurable: { thread_id },
        streamMode: "updates" as const,
        recursionLimit: 25,
        durability: "sync" as const,
        signal,
    };

    let request: ReviewRequest | undefined;
    try {
        for await (const chunk of await graph.stream(input, config)) {
            // Graph contract: "updates" chunks look like { [nodeName]: partialUpdate }.
            for (const [name, update] of Object.entries(chunk)) {
                if (name === INTERRUPT) {
                    // Graph contract: the pause arrives as { __interrupt__: [{ value: ReviewRequest }] }.
                    // Do not break here: the graph saves the pause after this chunk, and leaving the loop early
                    // cancels that save. Let the stream end by itself, then send the event.
                    request = (update as { value: ReviewRequest }[])[0].value;
                } else if (name === "critic") {
                    // `passed` tells the UI right away whether the rewriter will run (supervisor rule 4).
                    const passed = (update as { critique?: { passed: boolean } }).critique?.passed;
                    yield { event: "node", data: { name: "critic", passed } };
                } else if (name !== "supervisor") {
                    yield { event: "node", data: { name: name as StepName } };
                }
            }
        }
    } catch (err) {
        if (signal.aborted || isAbort(err)) return; // client left; the run is checkpointed and can continue later
        // The checkpoint tells us which node failed, so the UI does not have to guess.
        const status = await getRunStatus(thread_id).catch(() => null);
        const node = status && status.status === "failed" ? status.error.node : null;
        yield { event: "error", data: { message: shortMessage(err), node } };
        return;
    }

    if (signal.aborted) return;
    if (request) {
        yield { event: "interrupt", data: { request } };
        return;
    }
    const status = await getRunStatus(thread_id);
    if (status.status === "done") yield { event: "done", data: status.result };
    else if (status.status === "failed") yield { event: "error", data: status.error };
    else yield { event: "error", data: { message: `The run stopped unexpectedly (${status.status}).`, node: null } };
}
