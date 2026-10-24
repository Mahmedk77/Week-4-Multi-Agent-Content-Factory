import { Command } from "@langchain/langgraph";
import { ReviewSchema } from "@/graph/approval";
import { getRunStatus } from "@/server/runStatus";
import { streamRun } from "@/server/runStream";
import { jsonError, readJson, sseResponse } from "@/server/sse";
import { readUuidParam } from "@/server/threadId";
import { lockedResponse } from "@/server/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// POST /api/runs/[id]/review  { action, editedDraft? }  ->  SSE: node*, then done | error
export async function POST(request: Request, ctx: RouteContext<"/api/runs/[id]/review">) {
    const locked = await lockedResponse(); // passcode check (also done in src/proxy.ts)
    if (locked) return locked;

    const thread_id = await readUuidParam(ctx.params);
    if (!thread_id) return jsonError(400, "invalid run id");

    // Same schema the approval node uses, so a bad body is a 400 here instead of a ZodError inside the graph.
    const body = ReviewSchema.safeParse(await readJson(request));
    if (!body.success) return jsonError(400, 'action must be "approve" or "reject"');

    // Graph contract: resuming a thread that is not paused silently does nothing, so refuse it explicitly.
    const status = await getRunStatus(thread_id);
    if (status.status === "not_found") return jsonError(404, "run not found");
    if (status.status !== "paused") return jsonError(409, "This run is not waiting for a review (already decided?)");

    // Graph contract: resume must be a Command with the SAME thread_id; a plain object would start a new run.
    return sseResponse(request, (signal) => streamRun(new Command({ resume: body.data }), thread_id, signal));
}
