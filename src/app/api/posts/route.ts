import type { NextRequest } from "next/server";
import { listPosts } from "@/server/posts";
import { jsonError } from "@/server/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/posts?status=published|draft  ->  Post[] newest first
export async function GET(request: NextRequest) {
    const status = request.nextUrl.searchParams.get("status");
    if (status !== "published" && status !== "draft") return jsonError(400, 'status must be "published" or "draft"');

    try {
        return Response.json(await listPosts(status));
    } catch (err) {
        console.error("[posts] list failed:", err instanceof Error ? err.message : err);
        return jsonError(500, "Could not load posts");
    }
}
