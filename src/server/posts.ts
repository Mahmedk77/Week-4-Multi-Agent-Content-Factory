import "server-only";
import { getCheckpointer } from "@/graph/checkpointer";
import { extractTitle } from "@/graph/publisher";
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

export type DraftUpdateResult = "saved" | "not_found" | "not_draft";

// Saves edits to a draft and keeps it a draft. Only drafts can be changed: the status check is part of the update.
export async function saveDraft(id: string, content: string): Promise<DraftUpdateResult> {
    const db = getSupabase();
    const { data, error } = await db
        .from("posts")
        .update({ content, title: extractTitle(content) })
        .eq("id", id)
        .eq("status", "draft")
        .select("id");
    if (error) throw new Error(`Posts: save failed: ${error.message}`);
    if (data && data.length > 0) return "saved";
    const { data: row } = await db.from("posts").select("id").eq("id", id).maybeSingle();
    return row ? "not_draft" : "not_found";
}

export type PublishResult = "published" | "not_found" | "not_draft";

// Publishes a draft with (possibly edited) content. The title is re-read from the first "# " line, the same
// rule the graph's publisher uses. Only drafts can be published: the status check is part of the update itself.
export async function publishDraft(id: string, content: string): Promise<PublishResult> {
    const db = getSupabase();
    const { data, error } = await db
        .from("posts")
        .update({ content, title: extractTitle(content), status: "published", published_at: new Date().toISOString() })
        .eq("id", id)
        .eq("status", "draft")
        .select("id");
    if (error) throw new Error(`Posts: publish failed: ${error.message}`);
    if (data && data.length > 0) return "published";

    // Nothing updated: either no such post, or it isn't a draft (already published in another tab).
    const { data: row } = await db.from("posts").select("id").eq("id", id).maybeSingle();
    return row ? "not_draft" : "not_found";
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
