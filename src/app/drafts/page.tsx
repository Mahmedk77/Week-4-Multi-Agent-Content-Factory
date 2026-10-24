import type { Metadata } from "next";
import { PostsView } from "@/components/posts/PostsView";

export const dynamic = "force-dynamic"; // always read fresh rows
export const metadata: Metadata = { title: "Drafts · Draftloom" };

export default function DraftsPage() {
    return <PostsView status="draft" />;
}
