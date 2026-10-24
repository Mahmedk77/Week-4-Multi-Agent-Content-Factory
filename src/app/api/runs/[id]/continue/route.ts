import { getRunStatus } from "@/server/runStatus";
import { streamRun } from "@/server/runStream";
import { jsonError, sseResponse } from "@/server/sse";
import { readUuidParam } from "@/server/threadId";
import { lockedResponse } from "@/server/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST /api/runs/[id]/continue  ->  SSE: node*, then interrupt | done | error
// Retries a failed or stopped run from its last checkpoint. Finished steps are not run again.
export async function POST(request: Request, ctx: RouteContext<"/api/runs/[id]/continue">) {
    const locked = await lockedResponse(); // passcode check (also done in src/proxy.ts)
    if (locked) return locked;

    const thread_id = await readUuidParam(ctx.params);
    if (!thread_id) return jsonError(400, "invalid run id");

    const status = await getRunStatus(thread_id);
    if (status.status === "not_found") return jsonError(404, "run not found");
    if (status.status !== "failed" && status.status !== "stalled") {
        return jsonError(409, `Nothing to continue (run is ${status.status})`);
    }

    // Graph contract: stream(null) with the same thread_id re-runs the pending (failed) node from the last checkpoint.
    return sseResponse(request, (signal) => streamRun(null, thread_id, signal));
}
