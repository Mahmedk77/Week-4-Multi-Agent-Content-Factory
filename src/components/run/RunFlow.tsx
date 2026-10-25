"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ButtonLink } from "../Button";
import { Notice } from "../Notice";
import { Spinner } from "../icons";
import { useMediaQuery } from "../useMediaQuery";
import { pipeline } from "./flow";
import { IdleView } from "./IdleView";
import { ProgressView } from "./ProgressView";
import { ResultDialog } from "./ResultDialog";
import { ResultView } from "./ResultView";
import { ReviewView } from "./ReviewView";
import { setRunParam, useRun } from "./RunProvider";

// The home page: renders whatever the run in <RunProvider> is doing. The run itself (state + live stream)
// lives in the root layout, so leaving this page doesn't stop or lose it.
export function RunFlow() {
    const run = useRun();
    const { flow } = run;
    const runParam = useSearchParams().get("run");
    const phone = useMediaQuery("(max-width: 639px)");

    // Decide which run to show when this page opens or its URL changes.
    useEffect(() => {
        const current = run.currentThread();
        if (runParam) {
            if (runParam !== current) run.open(runParam); // a ?run= link or a reload
            return;
        }
        // Plain "/" (the New tab): bring back the run that's in progress instead of a blank form.
        if (current) {
            if (flow.view === "result") run.startAnother(); // finished: New means a fresh form
            else setRunParam(current);
            return;
        }
        const stored = run.storedThread(); // reload or new tab: the last unfinished run
        if (stored) run.open(stored);
        // Only the URL should trigger this; run/flow are read at that moment on purpose.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [runParam]);

    const steps = pipeline(flow);

    switch (flow.view) {
        case "idle":
            return <IdleView topic={flow.topic} error={flow.startError} onTopic={run.setTopic} onStart={() => run.start(flow.topic)} />;
        case "loading":
            return (
                <main className="max-w-[1120px] mx-auto px-4 sm:px-10 pt-16 flex items-center gap-3 text-muted" role="status">
                    <Spinner /> Loading the run…
                </main>
            );
        case "not_found":
            return (
                <main className="max-w-[760px] mx-auto px-4 sm:px-10 pt-16 flex flex-col gap-5 items-start">
                    <Notice tone="warn" title="Run not found">This link doesn&apos;t match a saved run. It may have been deleted.</Notice>
                    <ButtonLink href="/" onClick={run.startAnother}>Start a run</ButtonLink>
                </main>
            );
        case "progress":
            return <ProgressView flow={flow} steps={steps} onContinue={run.continueRun} onStartOver={() => run.start(flow.topic)} onNewTopic={run.startAnother} />;
        case "review":
            return <ReviewView flow={flow} steps={steps} onEdit={run.edit} onDecide={run.decide} onRetrySave={run.retrySave} onBack={run.startAnother} />;
        case "result":
            if (!phone) return <ResultView flow={flow} steps={steps} onStartAnother={run.startAnother} />;
            // Phone: the result is a dialog over the dimmed review screen (inert behind the dialog).
            return (
                <>
                    {flow.request && <ReviewView flow={flow} steps={steps} onEdit={() => {}} onDecide={() => {}} onRetrySave={() => {}} onBack={run.startAnother} />}
                    <ResultDialog flow={flow} onStartAnother={run.startAnother} />
                </>
            );
    }
}
