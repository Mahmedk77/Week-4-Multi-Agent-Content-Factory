import "server-only";
import type { RunEvent } from "@/lib/run-types";

const HEADERS = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // stops proxies from buffering the stream
};

// Builds an SSE response. `makeEvents` gets an AbortSignal that fires when the browser disconnects.
export function sseResponse(request: Request, makeEvents: (signal: AbortSignal) => AsyncIterable<RunEvent>): Response {
    const encoder = new TextEncoder();
    const abort = new AbortController();
    request.signal.addEventListener("abort", () => abort.abort(), { once: true });

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            try {
                for await (const e of makeEvents(abort.signal)) {
                    if (abort.signal.aborted) break;
                    // SSE frame: "event: <name>\ndata: <json>\n\n"
                    controller.enqueue(encoder.encode(`event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`));
                }
            } catch (err) {
                console.error("[sse] stream failed:", err instanceof Error ? err.message : err);
            } finally {
                try { controller.close(); } catch { /* already closed by cancel */ }
            }
        },
        cancel() {
            abort.abort();
        },
    });

    return new Response(stream, { headers: HEADERS });
}

export function jsonError(status: number, message: string): Response {
    return Response.json({ error: message }, { status });
}

export async function readJson(request: Request): Promise<unknown> {
    try {
        return await request.json();
    } catch {
        return undefined;
    }
}
