"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef } from "react";
import type { RunStatus } from "@/lib/run-types";
import { errorMessage, readEvents } from "@/lib/sse";
import { ButtonLink } from "../Button";
import { Notice } from "../Notice";
import { Spinner } from "../icons";
import { type Decision, initialFlow, pipeline, reducer } from "./flow";
import { IdleView } from "./IdleView";
import { ProgressView } from "./ProgressView";
import { useMediaQuery } from "../useMediaQuery";
import { ResultDialog } from "./ResultDialog";
import { ResultView } from "./ResultView";
import { ReviewView } from "./ReviewView";

// The thread id lives in the URL (/?run=<id>) so a refresh can restore the run from the server.
function setRunParam(id: string | null) {
    window.history.replaceState(null, "", id ? `/?run=${id}` : "/");
}

export function RunFlow() {
    const [flow, dispatch] = useReducer(reducer, initialFlow);
    const runParam = useSearchParams().get("run");
    const phone = useMediaQuery("(max-width: 639px)");

    const threadRef = useRef<string | null>(null); // current thread id, readable inside async callbacks
    const abortRef = useRef<AbortController | null>(null); // the open stream, if any
    const busyRef = useRef(false); // double-click guard: state updates are async, a ref is not

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

    // React to the URL: open ?run=<id> on load, and go back to idle when the user navigates to plain "/".
    useEffect(() => {
        if (runParam && runParam !== threadRef.current) {
            abortRef.current?.abort();
            void restore(runParam, true);
        } else if (!runParam && threadRef.current) {
            abortRef.current?.abort();
            threadRef.current = null;
            dispatch({ type: "reset" });
        }
    }, [runParam, restore]);

    const start = async (topic: string) => {
        if (busyRef.current) return;
        busyRef.current = true;
        threadRef.current = null;
        dispatch({ type: "start", topic, now: Date.now() });
        const r = await stream("/api/runs", { topic: topic.trim() });
        if (!r.ok) dispatch({ type: "startError", message: r.message });
        busyRef.current = false;
    };

    const continueRun = async () => {
        const id = threadRef.current;
        if (!id || busyRef.current) return;
        busyRef.current = true;
        dispatch({ type: "continue", now: Date.now() });
        const r = await stream(`/api/runs/${id}/continue`);
        if (!r.ok) await restore(id, false); // 409: the run moved on (e.g. another tab); show its real state
        busyRef.current = false;
    };

    const decide = async (decision: Decision) => {
        const id = threadRef.current;
        if (!id || busyRef.current) return;
        busyRef.current = true;
        dispatch({ type: "submit", decision });
        // Both actions send the current textarea text as editedDraft.
        const r = await stream(`/api/runs/${id}/review`, { action: decision, editedDraft: flow.draft });
        if (!r.ok) {
            if (r.status === 409) await restore(id, false); // already decided (other tab / double submit): show the real outcome
            else dispatch({ type: "submitError", message: r.message });
        }
        busyRef.current = false;
    };

    // The decision is recorded but the publisher failed: re-run the publisher only.
    const retrySave = async () => {
        const id = threadRef.current;
        if (!id || busyRef.current) return;
        busyRef.current = true;
        dispatch({ type: "submit", decision: "approve" });
        const r = await stream(`/api/runs/${id}/continue`);
        if (!r.ok) await restore(id, false);
        busyRef.current = false;
    };

    const startAnother = () => {
        abortRef.current?.abort();
        threadRef.current = null;
        setRunParam(null);
        dispatch({ type: "reset" });
    };

    const steps = pipeline(flow);

    switch (flow.view) {
        case "idle":
            return <IdleView topic={flow.topic} error={flow.startError} onTopic={(topic) => dispatch({ type: "topic", topic })} onStart={() => start(flow.topic)} />;
        case "loading":
            return (
                <main className="max-w-[1120px] mx-auto px-4 sm:px-10 pt-16 flex items-center gap-3 text-muted" role="status">
                    <Spinner /> Loading the run…
                </main>
            );
        case "not_found":
            return (
                <main className="max-w-[760px] mx-auto px-4 sm:px-10 pt-16 flex flex-col gap-5 items-start">
                    <Notice tone="warn" title="Run not found">This link doesn&apos;t match a saved run. It may have been started on another database.</Notice>
                    <ButtonLink href="/" onClick={startAnother}>Start a run</ButtonLink>
                </main>
            );
        case "progress":
            return <ProgressView flow={flow} steps={steps} onContinue={continueRun} onStartOver={() => start(flow.topic)} />;
        case "review":
            return <ReviewView flow={flow} steps={steps} onEdit={(text) => dispatch({ type: "edit", text })} onDecide={decide} onRetrySave={retrySave} onBack={startAnother} />;
        case "result":
            if (!phone) return <ResultView flow={flow} steps={steps} onStartAnother={startAnother} />;
            // Phone: the result is a dialog over the dimmed review screen (inert behind the dialog).
            return (
                <>
                    {flow.request && <ReviewView flow={flow} steps={steps} onEdit={() => {}} onDecide={() => {}} onRetrySave={() => {}} onBack={startAnother} />}
                    <ResultDialog flow={flow} onStartAnother={startAnother} />
                </>
            );
    }
}
