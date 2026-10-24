import { getRunStatus } from "@/server/runStatus";
import { jsonError } from "@/server/sse";
import { readUuidParam } from "@/server/threadId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/runs/[id]  ->  RunStatus JSON. Lets the UI restore a run after a refresh or a server restart.
export async function GET(_request: Request, ctx: RouteContext<"/api/runs/[id]">) {
    const thread_id = await readUuidParam(ctx.params);
    if (!thread_id) return jsonError(400, "invalid run id");

    try {
        const status = await getRunStatus(thread_id);
        return Response.json(status, { status: status.status === "not_found" ? 404 : 200 });
    } catch (err) {
        console.error("[runs/:id] status failed:", err instanceof Error ? err.message : err);
        return jsonError(500, "Could not read the run");
    }
}
