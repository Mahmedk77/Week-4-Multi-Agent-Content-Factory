// Shared by server routes and client components.
// Only `import type` from the graph here: types are erased at build time, so no graph code reaches the browser.
import type { ReviewRequest } from "@/graph/approval";
import type { Critique } from "@/graph/state";

export type { ReviewRequest, Critique };

export type StepName = "researcher" | "writer" | "critic" | "rewriter" | "approval" | "publisher";

export type RunResult = { approved: boolean; published: boolean; title: string };
export type RunError = { message: string; node: string | null };

// SSE events sent by /api/runs, /api/runs/[id]/review and /api/runs/[id]/continue.
export type RunEvent =
    | { event: "thread"; data: { thread_id: string } }
    | { event: "node"; data: { name: StepName; passed?: boolean } } // `passed` is only set for the critic
    | { event: "interrupt"; data: { request: ReviewRequest } }
    | { event: "done"; data: RunResult }
    | { event: "error"; data: RunError };

type StatusBase = { thread_id: string; topic: string; completed: StepName[] };

// JSON returned by GET /api/runs/[id].
export type RunStatus =
    | { status: "not_found" }
    | (StatusBase & { status: "paused"; request: ReviewRequest })
    | (StatusBase & { status: "failed"; error: RunError })
    | (StatusBase & { status: "stalled"; next: string })
    | (StatusBase & { status: "done"; result: RunResult });

export type Source = { title: string; url: string };

export type Post = {
    id: string;
    title: string;
    content: string;
    research_sources: Source[];
    status: "published" | "draft";
    published_at: string | null;
    created_at: string;
};
