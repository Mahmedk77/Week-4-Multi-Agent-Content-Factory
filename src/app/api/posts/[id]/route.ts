import { deletePost } from "@/server/posts";
import { jsonError } from "@/server/sse";
import { readUuidParam } from "@/server/threadId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE /api/posts/[id]  ->  204, or 404 when no post has that id
export async function DELETE(_request: Request, ctx: RouteContext<"/api/posts/[id]">) {
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
