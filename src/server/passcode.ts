// Site-wide passcode lock. Shared by src/proxy.ts and the server routes.
// No "server-only" import here: the proxy is not a React Server Component, and that package would throw there.
import { createHmac, timingSafeEqual } from "node:crypto";

export const UNLOCK_COOKIE = "dl_unlock";
export const UNLOCK_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function configured(): string | undefined {
    return process.env.SITE_PASSCODE || undefined;
}

// The cookie holds an HMAC keyed by the passcode, never the passcode itself. It can't be forged without
// the passcode, and changing SITE_PASSCODE in Vercel logs every browser out.
function token(code: string): string {
    return createHmac("sha256", code).update("draftloom-unlock-v1").digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
    const A = Buffer.from(a);
    const B = Buffer.from(b);
    return A.length === B.length && timingSafeEqual(A, B);
}

// No SITE_PASSCODE: open in local dev, locked in production (fail closed, so a missing env var never exposes the app).
export function lockEnabled(): boolean {
    return !!configured() || process.env.NODE_ENV === "production";
}

export function isUnlocked(cookieValue: string | undefined): boolean {
    const code = configured();
    if (!code) return process.env.NODE_ENV !== "production";
    return !!cookieValue && safeEqual(cookieValue, token(code));
}

// Compares HMACs of both values, so the comparison is constant-time and length-independent.
export function checkPasscode(input: string): boolean {
    const code = configured();
    return !!code && safeEqual(token(input), token(code));
}

export function unlockCookieValue(): string {
    const code = configured();
    if (!code) throw new Error("SITE_PASSCODE is not set");
    return token(code);
}

// Only allow redirects back to our own pages after unlocking (no "//evil.com" or absolute URLs).
export function safeNext(next: string | null | undefined): string {
    if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/unlock")) return "/";
    return next;
}
