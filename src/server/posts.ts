import "server-only";
import { getCheckpointer } from "@/graph/checkpointer";
import type { Post } from "@/lib/run-types";
import { getSupabase } from "./supabase";

export async function listPosts(status: Post["status"]): Promise<Post[]> {
    const { data, error } = await getSupabase()
        .from("posts")
        .select("id, title, content, research_sources, status, published_at, created_at")
        .eq("status", status)
        .order(status === "published" ? "published_at" : "created_at", { ascending: false });
    if (error) throw new Error(`Posts: load failed: ${error.message}`);
    return (data ?? []) as Post[];
}

// Deletes the post row, then the run's checkpoints (same thread_id), so nothing of the run is left behind.
// Returns false when no post had that id.
export async function deletePost(id: string): Promise<boolean> {
    const { data, error } = await getSupabase().from("posts").delete().eq("id", id).select("thread_id");
    if (error) throw new Error(`Posts: delete failed: ${error.message}`);
    const row = data?.[0] as { thread_id: string } | undefined;
    if (!row) return false;

    try {
        await getCheckpointer().deleteThread(row.thread_id);
    } catch (err) {
        // The post is already gone; a leftover checkpoint only means its old ?run= link still opens.
        console.warn(`[posts] checkpoint cleanup failed for ${row.thread_id}: ${err instanceof Error ? err.message : err}`);
    }
    return true;
}
