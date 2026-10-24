import type { RunEvent } from "./run-types";

// Reads our SSE frames from a fetch() response. EventSource can't be used: it only supports GET and these routes are POST.
// Returns when the stream ends (normally, or because `signal` aborted).
export async function readEvents(response: Response, onEvent: (e: RunEvent) => void): Promise<void> {
    if (!response.body) throw new Error("No response body");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // A frame can be split across chunks, so only handle complete frames (ending in a blank line).
        let end: number;
        while ((end = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            const parsed = parseFrame(frame);
            if (parsed) onEvent(parsed);
        }
    }
}

function parseFrame(frame: string): RunEvent | null {
    let event = "";
    let data = "";
    for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
    }
    if (!event || !data) return null;
    try {
        return { event, data: JSON.parse(data) } as RunEvent;
    } catch {
        return null;
    }
}

// Error body of a non-stream response (400/404/409), e.g. { error: "..." }.
export async function errorMessage(response: Response): Promise<string> {
    try {
        const body = (await response.json()) as { error?: string };
        return body.error ?? `Request failed (${response.status})`;
    } catch {
        return `Request failed (${response.status})`;
    }
}
