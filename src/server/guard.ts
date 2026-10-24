import "server-only";
import { cookies } from "next/headers";
import { UNLOCK_COOKIE, isUnlocked } from "./passcode";

// Second check inside routes and pages, in case the proxy matcher ever misses a path (Next docs: don't rely on proxy alone).
export async function unlocked(): Promise<boolean> {
    return isUnlocked((await cookies()).get(UNLOCK_COOKIE)?.value);
}

export async function lockedResponse(): Promise<Response | null> {
    return (await unlocked()) ? null : Response.json({ error: "Locked. Enter the passcode first." }, { status: 401 });
}
