"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import type { RunStatus } from "@/lib/run-types";
import { errorMessage, readEvents } from "@/lib/sse";
import { type Decision, type Flow, initialFlow, reducer } from "./flow";

// The run lives here, in the root layout, not in the home page. The layout stays mounted while you switch
// tabs, so a run keeps streaming while you look at Published/Drafts and "New" shows it again where it is.
// The active run id is also kept in localStorage, so a reload or a new tab can find it.

const STORAGE_KEY = "draftloom.activeRun";

function readStoredRun(): string | null {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function storeRun(id: string | null) {
    try {
        if (id) localStorage.setItem(STORAGE_KEY, id);
        else localStorage.removeItem(STORAGE_KEY);
    } catch { /* storage blocked: only reloads lose the run, tab switches still keep it */ }
}

// The thread id is also in the URL (/?run=<id>) so the run can be bookmarked or reopened.
// Only touch the URL while on the home page; the other pages have their own URLs.
export function setRunParam(id: string | null) {
    if (window.location.pathname !== "/") return;
    window.history.replaceState(null, "", id ? `/?run=${id}` : "/");
}

type RunApi = {
    flow: Flow;
    edit: (text: string) => void;
    setTopic: (topic: string) => void;
    start: (topic: string) => Promise<void>;
    continueRun: () => Promise<void>;
    decide: (decision: Decision) => Promise<void>;
    retrySave: () => Promise<void>;
    startAnother: () => void;
    open: (id: string) => void; // show a saved run (from ?run= or localStorage)
    currentThread: () => string | null;
    storedThread: () => string | null;
};

const RunContext = createContext<RunApi | null>(null);

export function useRun(): RunApi {
    const api = useContext(RunContext);
    if (!api) throw new Error("useRun must be used inside <RunProvider>");
    return api;
}

export function RunProvider({ children }: { children: React.ReactNode }) {
    const [flow, dispatch] = useReducer(reducer, initialFlow);

    const flowRef = useRef(flow); // latest state for async actions (avoids stale closures)
    useEffect(() => { flowRef.current = flow; }, [flow]);
    const threadRef = useRef<string | null>(null); // current thread id, readable inside async callbacks
    const abortRef = useRef<AbortController | null>(null); // the open stream, if any
    const busyRef = useRef(false); // double-click guard: state updates are async, a ref is not

    // Remember unfinished runs; forget finished ones (cleared explicitly in startAnother too).
    useEffect(() => {
        if (flow.threadId && (flow.view === "progress" || flow.view === "review")) storeRun(flow.threadId);
        else if (flow.view === "result" || flow.view === "not_found") storeRun(null);
    }, [flow.view, flow.threadId]);

    const restore = useCallback(async (id: string, showLoading: boolean) => {
        if (showLoading) dispatch({ type: "loading" });
        try {
            const res = await fetch(`/api/runs/${id}`, { cache: "no-store" });
            if (!res.ok && res.status !== 404) throw new Error(await errorMessage(res));
            const status = (await res.json()) as RunStatus;
            threadRef.current = id;
            dispatch({ type: "restore", status });
        } catch {
            dispatch({ type: "lost" });
        }
    }, []);

    // POST a streaming route and feed its events into the reducer.
    // If the stream ends without interrupt/done/error, ask the server what state the run is in.
    const stream = useCallback(async (url: string, body?: unknown): Promise<{ ok: true } | { ok: false; status: number; message: string }> => {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        let terminal = false;

        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: body === undefined ? undefined : JSON.stringify(body),
                signal: ac.signal,
            });
            if (!res.ok) return { ok: false, status: res.status, message: await errorMessage(res) };

            await readEvents(res, (event) => {
                if (event.event === "thread") {
                    threadRef.current = event.data.thread_id;
                    setRunParam(event.data.thread_id);
                }
                if (event.event === "interrupt" || event.event === "done" || event.event === "error") terminal = true;
                dispatch({ type: "event", event, now: Date.now() });
            });
        } catch {
            if (ac.signal.aborted) return { ok: true };
        }

        if (!terminal && !ac.signal.aborted) {
            if (threadRef.current) await restore(threadRef.current, false);
            else dispatch({ type: "lost" });
        }
        return { ok: true };
    }, [restore]);

    const start = useCallback(async (topic: string) => {
        if (busyRef.current) return;
        busyRef.current = true;
        threadRef.current = null;
        dispatch({ type: "start", topic, now: Date.now() });
        const r = await stream("/api/runs", { topic: topic.trim() });
        if (!r.ok) dispatch({ type: "startError", message: r.message });
        busyRef.current = false;
    }, [stream]);

    const continueRun = useCallback(async () => {
        const id = threadRef.current;
        if (!id || busyRef.current) return;
        busyRef.current = true;
        dispatch({ type: "continue", now: Date.now() });
        const r = await stream(`/api/runs/${id}/continue`);
        if (!r.ok) await restore(id, false); // 409: the run moved on (e.g. another tab); show its real state
        busyRef.current = false;
    }, [stream, restore]);

    const decide = useCallback(async (decision: Decision) => {
        const id = threadRef.current;
        if (!id || busyRef.current) return;
        busyRef.current = true;
        dispatch({ type: "submit", decision });
        // Both actions send the current textarea text as editedDraft.
        const r = await stream(`/api/runs/${id}/review`, { action: decision, editedDraft: flowRef.current.draft });
        if (!r.ok) {
            if (r.status === 409) await restore(id, false); // already decided (other tab / double submit): show the real outcome
            else dispatch({ type: "submitError", message: r.message });
        }
        busyRef.current = false;
    }, [stream, restore]);

    // The decision is recorded but the publisher failed: re-run the publisher only.
    const retrySave = useCallback(async () => {
        const id = threadRef.current;
        if (!id || busyRef.current) return;
        busyRef.current = true;
        dispatch({ type: "submit", decision: "approve" });
        const r = await stream(`/api/runs/${id}/continue`);
        if (!r.ok) await restore(id, false);
        busyRef.current = false;
    }, [stream, restore]);

    // Leave the current run (it stays saved on the server) and show an empty form.
    const startAnother = useCallback(() => {
        abortRef.current?.abort();
        threadRef.current = null;
        storeRun(null);
        setRunParam(null);
        dispatch({ type: "reset" });
    }, []);

    const open = useCallback((id: string) => {
        abortRef.current?.abort();
        threadRef.current = id;
        setRunParam(id);
        void restore(id, true);
    }, [restore]);

    const api = useMemo<RunApi>(() => ({
        flow,
        edit: (text) => dispatch({ type: "edit", text }),
        setTopic: (topic) => dispatch({ type: "topic", topic }),
        start, continueRun, decide, retrySave, startAnother, open,
        currentThread: () => threadRef.current,
        storedThread: readStoredRun,
    }), [flow, start, continueRun, decide, retrySave, startAnother, open]);

    return <RunContext.Provider value={api}>{children}</RunContext.Provider>;
}
