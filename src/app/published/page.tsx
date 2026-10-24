import type { Metadata } from "next";
import { PostsView } from "@/components/posts/PostsView";

export const dynamic = "force-dynamic"; // always read fresh rows
export const metadata: Metadata = { title: "Published · Draftloom" };

export default function PublishedPage() {
    return <PostsView status="published" />;
}
