import z from "zod";
import { lockedResponse } from "@/server/guard";
import { publishDraft } from "@/server/posts";
import { jsonError, readJson } from "@/server/sse";
import { readUuidParam } from "@/server/threadId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ content: z.string().trim().min(1).max(100_000) });

// POST /api/posts/[id]/publish { content } -> 200, 404 (no such post) or 409 (not a draft any more)
export async function POST(request: Request, ctx: RouteContext<"/api/posts/[id]/publish">) {
    const locked = await lockedResponse(); // passcode check (also done in src/proxy.ts)
    if (locked) return locked;

    const id = await readUuidParam(ctx.params);
    if (!id) return jsonError(400, "invalid post id");

    const body = Body.safeParse(await readJson(request));
    if (!body.success) return jsonError(400, "The post can't be empty.");

    try {
        const result = await publishDraft(id, body.data.content);
        if (result === "not_found") return jsonError(404, "This draft no longer exists.");
        if (result === "not_draft") return jsonError(409, "This post is already published.");
        return Response.json({ ok: true });
    } catch (err) {
        console.error("[posts/:id/publish] failed:", err instanceof Error ? err.message : err);
        return jsonError(500, "Could not publish the post.");
    }
}
