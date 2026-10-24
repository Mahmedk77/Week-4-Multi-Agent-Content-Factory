import { randomUUID } from "node:crypto";
import z from "zod";
import { streamRun } from "@/server/runStream";
import { jsonError, readJson, sseResponse } from "@/server/sse";

export const runtime = "nodejs"; // pg does not run on the edge runtime
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const Body = z.object({ topic: z.string().trim().min(1).max(200) });

// POST /api/runs  { topic }  ->  SSE: thread, node*, then interrupt | error
export async function POST(request: Request) {
    const body = Body.safeParse(await readJson(request));
    if (!body.success) return jsonError(400, "topic must be 1-200 characters");

    // Graph contract: thread_id is created here and is the key for checkpoints, resume and the posts row.
    const thread_id = randomUUID();

    return sseResponse(request, async function* (signal) {
        yield { event: "thread", data: { thread_id } };
        yield* streamRun({ topic: body.data.topic }, thread_id, signal);
    });
}
