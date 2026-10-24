"use client";

import { Notice } from "../Notice";
import { BackIcon } from "../icons";
import { ThemeToggle } from "../ThemeToggle";
import { CriticBar, CriticPanel } from "./CriticPanel";
import { DecisionBar, MobileDecisionBar } from "./DecisionBar";
import { DraftEditor } from "./DraftEditor";
import type { Decision, Flow, Step } from "./flow";
import { PipelineSummary, StepChips } from "./Pipeline";

type Props = {
    flow: Flow;
    steps: Step[];
    onEdit: (text: string) => void;
    onDecide: (d: Decision) => void;
    onRetrySave: () => void;
    onBack: () => void;
};

export function ReviewView({ flow, steps, onEdit, onDecide, onRetrySave, onBack }: Props) {
    const request = flow.request;
    if (!request) return null;
    const locked = flow.saving != null || flow.submitError?.retrySave === true;

    return (
        // data-mobile-focus: on phones this screen brings its own top bar and bottom action bar (see globals.css).
        // data-fit-viewport: on desktop the screen fills the window exactly; only the draft (and a long critique) scroll inside.
        <main
            data-mobile-focus
            data-fit-viewport
            className="max-w-[1120px] mx-auto px-5 sm:px-10 pt-0 sm:pt-7 max-sm:pb-[calc(232px+env(safe-area-inset-bottom))] sm:pb-7 sm:h-full sm:flex sm:flex-col"
        >
            {/* Phone top bar: back, status, theme */}
            <div className="sm:hidden flex items-center justify-between gap-2 pt-3 pb-2">
                <button
                    type="button"
                    onClick={onBack}
                    disabled={flow.saving != null}
                    aria-label="Back to New (the run stays saved)"
                    className="w-11 h-11 grid place-items-center rounded-[14px] border border-line bg-surface text-ink cursor-pointer disabled:opacity-60"
                >
                    <BackIcon size={20} />
                </button>
                <span className="label-mono text-xs tracking-[.08em] text-accent">Waiting for your review</span>
                <ThemeToggle variant="tile" />
            </div>

            <div className="sm:flex-none">
                <p className="hidden sm:block label-mono text-xs tracking-[.08em] text-accent mb-2">Waiting for your review</p>
                <h1 className="font-serif font-medium text-[26px] sm:text-[34px] leading-[1.15] tracking-[-0.015em] max-sm:mt-2">Review the draft</h1>
                <p className="hidden sm:block text-[13px] text-muted mt-1 mb-4 truncate">Topic: {flow.topic}</p>
            </div>

            <div className="hidden sm:block sm:flex-none"><PipelineSummary steps={steps} /></div>
            <div className="sm:hidden mt-3"><StepChips steps={steps} /></div>

            {flow.submitError && (
                <div className="sm:hidden mt-3">
                    <Notice tone="danger" title="Couldn't save your decision">
                        {flow.submitError.retrySave ? "Your decision was recorded, but saving the post failed." : "Your edits are still in the draft. Nothing was lost."}
                    </Notice>
                </div>
            )}

            {/* Desktop: draft on the left fills the remaining height; critique + Approve/Reject on the right. */}
            <div className="mt-3.5 sm:mt-5 sm:flex-1 sm:min-h-0 sm:flex sm:gap-6">
                <DraftEditor value={flow.draft} onChange={onEdit} locked={locked} />
                <div className="hidden sm:flex flex-col gap-4 min-h-0 flex-none w-[340px] lg:w-[380px]">
                    <CriticPanel critique={request.critique} rewritten={request.rewritten} />
                    <DecisionBar flow={flow} onDecide={onDecide} onRetrySave={onRetrySave} />
                </div>
            </div>
            <CriticBar critique={request.critique} rewritten={request.rewritten} />

            <MobileDecisionBar flow={flow} onDecide={onDecide} onRetrySave={onRetrySave} />
        </main>
    );
}
