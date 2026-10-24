import "server-only";
import type { Post } from "@/lib/run-types";
import { bodyOf, previewOf, wordCount } from "@/lib/text";
import { redirect } from "next/navigation";
import { unlocked } from "@/server/guard";
import { listPosts } from "@/server/posts";
import { ButtonLink } from "../Button";
import { DocIcon } from "../icons";
import { Notice } from "../Notice";
import { PostList, type PostItem } from "./PostList";

const DATE = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const DAY = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });

const COPY = {
    published: {
        title: "Published",
        lede: "Posts you approved, newest first.",
        emptyTitle: "Nothing published yet",
        emptyText: "When you approve a run, the post is published here.",
    },
    draft: {
        title: "Drafts",
        lede: "Runs you rejected. Your edited version is kept here, not published.",
        emptyTitle: "No drafts yet",
        emptyText: "When you reject a run, your edited version is saved here instead of being published.",
    },
} as const;

// Dates are formatted on the server so client hydration can't disagree about time zones.
function toItem(p: Post): PostItem {
    const date = new Date(p.status === "published" && p.published_at ? p.published_at : p.created_at);
    return {
        id: p.id,
        title: p.title,
        status: p.status,
        dateLabel: `${p.status === "published" ? "Published" : "Saved"} ${DATE.format(date)}`,
        date: DATE.format(date),
        day: DAY.format(date),
        sources: p.research_sources ?? [],
        words: wordCount(bodyOf(p.content)),
        preview: previewOf(p.content),
        body: bodyOf(p.content),
    };
}

// The page fills the viewport (data-fit-viewport) and only the list scrolls, so the header stays put.
export async function PostsView({ status }: { status: Post["status"] }) {
    // Passcode check (also done in src/proxy.ts): this page reads the database directly.
    if (!(await unlocked())) redirect(`/unlock?next=/${status === "published" ? "published" : "drafts"}`);
    const copy = COPY[status];
    let items: PostItem[] | null = null;
    let loadError: string | null = null;
    try {
        items = (await listPosts(status)).map(toItem);
    } catch (err) {
        console.error("[posts page] load failed:", err instanceof Error ? err.message : err);
        loadError = "The posts could not be loaded. Check the server log and try again.";
    }

    return (
        <main data-fit-viewport className="h-full w-full max-w-[920px] mx-auto px-5 sm:px-10 pt-3 sm:pt-12 pb-6 sm:pb-10 flex flex-col">
            <div className="flex-none flex flex-wrap gap-x-4 gap-y-1 items-baseline sm:items-end justify-between mb-4 sm:mb-5">
                <div>
                    <h1 className="font-serif font-medium text-[34px] sm:text-[36px] leading-[1.15] tracking-[-0.015em]">{copy.title}</h1>
                    <p className="hidden sm:block text-[13px] text-muted mt-1.5">{copy.lede}</p>
                </div>
                {items && items.length > 0 && (
                    <span className="font-mono text-xs text-muted">{items.length} {items.length === 1 ? "post" : "posts"}</span>
                )}
            </div>

            {loadError && <Notice tone="danger" title="Couldn't load posts">{loadError}</Notice>}

            {items && items.length === 0 && (
                <section className="bg-surface border border-line rounded-2xl shadow-card px-6 py-14 text-center flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-surface2 grid place-items-center text-muted" aria-hidden="true"><DocIcon size={22} /></div>
                    <h2 className="font-serif font-semibold text-2xl mt-4">{copy.emptyTitle}</h2>
                    <p className="text-muted mt-2 max-w-[420px]">{copy.emptyText}</p>
                    <ButtonLink href="/" className="mt-6">Start a run</ButtonLink>
                </section>
            )}

            {items && items.length > 0 && <PostList items={items} label={copy.title} />}
        </main>
    );
}
