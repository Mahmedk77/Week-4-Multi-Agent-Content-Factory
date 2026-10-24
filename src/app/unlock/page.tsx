import type { Metadata } from "next";
import { UnlockForm } from "@/components/UnlockForm";
import { safeNext } from "@/server/passcode";

export const metadata: Metadata = { title: "Unlock" };

export default async function UnlockPage({ searchParams }: PageProps<"/unlock">) {
    const { next } = await searchParams;
    return <UnlockForm next={safeNext(typeof next === "string" ? next : null)} />;
}
