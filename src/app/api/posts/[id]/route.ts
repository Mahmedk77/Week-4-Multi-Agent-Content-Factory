import z from "zod";
import { deletePost, saveDraft } from "@/server/posts";
import { jsonError, readJson } from "@/server/sse";
import { readUuidParam } from "@/server/threadId";
import { lockedResponse } from "@/server/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SaveBody = z.object({ content: z.string().trim().min(1).max(100_000) });

// PATCH /api/posts/[id] { content }  ->  200 (draft saved), 404, or 409 (not a draft: published posts can't be edited)
export async function PATCH(request: Request, ctx: RouteContext<"/api/posts/[id]">) {
    const locked = await lockedResponse(); // passcode check (also done in src/proxy.ts)
    if (locked) return locked;

    const id = await readUuidParam(ctx.params);
    if (!id) return jsonError(400, "invalid post id");

    const body = SaveBody.safeParse(await readJson(request));
    if (!body.success) return jsonError(400, "The post can't be empty.");

    try {
        const result = await saveDraft(id, body.data.content);
        if (result === "not_found") return jsonError(404, "This draft no longer exists.");
        if (result === "not_draft") return jsonError(409, "This post is already published.");
        return Response.json({ ok: true });
    } catch (err) {
        console.error("[posts/:id] save failed:", err instanceof Error ? err.message : err);
        return jsonError(500, "Could not save the draft.");
    }
}

// DELETE /api/posts/[id]  ->  204, or 404 when no post has that id
export async function DELETE(_request: Request, ctx: RouteContext<"/api/posts/[id]">) {
    const locked = await lockedResponse(); // passcode check (also done in src/proxy.ts)
    if (locked) return locked;

    const id = await readUuidParam(ctx.params);
    if (!id) return jsonError(400, "invalid post id");

    try {
        const deleted = await deletePost(id);
        return deleted ? new Response(null, { status: 204 }) : jsonError(404, "post not found");
    } catch (err) {
        console.error("[posts/:id] delete failed:", err instanceof Error ? err.message : err);
        return jsonError(500, "Could not delete the post");
    }
}
