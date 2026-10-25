import "server-only";
import { createHash } from "node:crypto";
import { getSupabase } from "./supabase";

// Per-IP limit on wrong passcodes. Kept in Supabase (table unlock_attempts, see scripts/setup-rate-limit.ts)
// because Vercel runs many short-lived instances: an in-memory counter would reset between requests.
export const MAX_FAILURES = 5;
export const WINDOW_MINUTES = 15;

// Vercel sets x-forwarded-for itself (the client can't spoof the first entry there). Local dev may not have it.
export function clientIp(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    return forwarded || request.headers.get("x-real-ip") || "unknown";
}

// Only a hash of the IP is stored, never the IP itself.
export function ipKey(ip: string): string {
    return createHash("sha256").update(`draftloom-unlock-ip:${ip}`).digest("hex");
}

// Every query gives up after 3s: a slow or unreachable Supabase must never stall the unlock screen.
const timeout = () => AbortSignal.timeout(3000);

export type Limit = { blocked: boolean; failures: number; retryAfterSeconds: number };

// Counts this IP's wrong attempts in the window. If the database can't be reached the limit is skipped
// (logged), so a Supabase outage can't lock the owner out; the 1s delay per wrong attempt still applies.
export async function checkLimit(key: string): Promise<Limit> {
    const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
    const { data, error } = await getSupabase()
        .from("unlock_attempts")
        .select("created_at")
        .eq("ip_hash", key)
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .abortSignal(timeout());
    if (error) {
        console.warn(`[rate-limit] check skipped: ${error.message}`);
        return { blocked: false, failures: 0, retryAfterSeconds: 0 };
    }
    const failures = data.length;
    if (failures < MAX_FAILURES) return { blocked: false, failures, retryAfterSeconds: 0 };
    // Unblocked once the oldest failure in the window expires.
    const oldest = new Date(data[0].created_at).getTime();
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + WINDOW_MINUTES * 60_000 - Date.now()) / 1000));
    return { blocked: true, failures, retryAfterSeconds };
}

export async function recordFailure(key: string): Promise<void> {
    const db = getSupabase();
    const { error } = await db.from("unlock_attempts").insert({ ip_hash: key }).abortSignal(timeout());
    if (error) console.warn(`[rate-limit] could not record attempt: ${error.message}`);
    // Housekeeping: drop rows older than a day so the table stays tiny.
    const dayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    await db.from("unlock_attempts").delete().lt("created_at", dayAgo).abortSignal(timeout());
}

export async function clearFailures(key: string): Promise<void> {
    const { error } = await getSupabase().from("unlock_attempts").delete().eq("ip_hash", key).abortSignal(timeout());
    if (error) console.warn(`[rate-limit] could not clear attempts: ${error.message}`);
}
