import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import pg from "pg";

// Cached on globalThis so Next dev hot reload reuses one pg pool instead of opening a new one per reload.
const cache = globalThis as unknown as { __checkpointer?: PostgresSaver };

function makePool(connectionString: string): pg.Pool {
    const pool = new pg.Pool({
        connectionString,
        keepAlive: true,          // TCP keep-alive so the pooler is less likely to drop a quiet connection
        idleTimeoutMillis: 10_000, // close idle connections ourselves before the Supabase pooler does
    });
    // Without a listener, a dropped idle connection (ECONNRESET) crashes the process. pg already discards that client.
    pool.on("error", (err) => console.warn(`[checkpointer] idle connection dropped: ${err.message}`));
    return pool;
}

export function getCheckpointer(): PostgresSaver {
    if (!cache.__checkpointer) {
        const url = process.env.SUPABASE_DB_URL;
        if (!url) throw new Error("Checkpointer: SUPABASE_DB_URL is missing");
        cache.__checkpointer = new PostgresSaver(makePool(url), undefined, { schema: "langgraph" });
    }
    return cache.__checkpointer;
}

export async function closeCheckPointer() {
    await cache.__checkpointer?.end();
    cache.__checkpointer = undefined;
}
