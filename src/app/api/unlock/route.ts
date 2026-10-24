import { NextResponse } from "next/server";
import z from "zod";
import { UNLOCK_COOKIE, UNLOCK_MAX_AGE, checkPasscode, lockEnabled, unlockCookieValue } from "@/server/passcode";
import { MAX_FAILURES, WINDOW_MINUTES, checkLimit, clearFailures, clientIp, ipKey, recordFailure } from "@/server/rateLimit";
import { jsonError, readJson } from "@/server/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ passcode: z.string().min(1).max(200) });

const minutes = (s: number) => Math.ceil(s / 60);

// POST /api/unlock { passcode } -> sets the unlock cookie.
// Wrong passcode: 401 after a short delay. 5 wrong tries per IP in 15 minutes: 429 until the window passes.
export async function POST(request: Request) {
    if (!process.env.SITE_PASSCODE) {
        return jsonError(503, lockEnabled() ? "The site passcode is not configured on the server." : "No passcode is set (local dev is open).");
    }

    // Checked before the passcode, so a blocked IP can't keep guessing (even the right code waits).
    const key = ipKey(clientIp(request));
    const limit = await checkLimit(key);
    if (limit.blocked) {
        return NextResponse.json(
            { error: `Too many wrong attempts. Try again in ${minutes(limit.retryAfterSeconds)} min.` },
            { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
        );
    }

    const body = Body.safeParse(await readJson(request));
    if (!body.success || !checkPasscode(body.data.passcode)) {
        await recordFailure(key);
        await new Promise((r) => setTimeout(r, 800)); // slows down guessing even below the limit
        const left = MAX_FAILURES - (limit.failures + 1);
        return jsonError(401, left > 0
            ? `Wrong passcode. ${left} ${left === 1 ? "try" : "tries"} left.`
            : `Wrong passcode. Too many attempts: try again in ${WINDOW_MINUTES} min.`);
    }

    await clearFailures(key);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(UNLOCK_COOKIE, unlockCookieValue(), {
        httpOnly: true, // not readable from JavaScript
        secure: process.env.NODE_ENV === "production", // HTTPS only on Vercel
        sameSite: "lax",
        path: "/",
        maxAge: UNLOCK_MAX_AGE,
    });
    return res;
}
