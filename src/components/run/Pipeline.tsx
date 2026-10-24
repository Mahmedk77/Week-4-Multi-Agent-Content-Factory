import { clock } from "@/lib/text";
import { BangIcon, CheckIcon, CrossIcon, Spinner } from "../icons";
import type { Flow, Step, StepKey } from "./flow";
import { STEPS, stateWord, stepDesc } from "./steps";

function Dot({ step }: { step: Step }) {
    const Icon = STEPS[step.key].icon;
    if (step.state === "done") return <div className="pipe-dot"><CheckIcon size={18} /></div>;
    if (step.state === "error") return <div className="pipe-dot"><CrossIcon size={16} /></div>;
    if (step.state === "running") return <div className="pipe-dot"><Spinner /></div>;
    if (step.state === "unknown") return <div className="pipe-dot"><BangIcon size={16} /></div>;
    return <div className="pipe-dot"><Icon size={16} /></div>;
}

const STATE_COLOR: Record<string, string> = {
    running: "text-accent",
    waiting: "text-accent",
    error: "text-danger",
    unknown: "text-warn",
};

const isQuiet = (s: Step) => s.state === "pending" || s.state === "blocked";

// Desktop: 5-step horizontal track.
export function Pipeline({ steps }: { steps: Step[] }) {
    return (
        <ol role="status" aria-live="polite" aria-label="Pipeline" className="grid grid-cols-5 gap-0">
            {steps.map((s) => {
                const pending = isQuiet(s) || s.state === "unknown";
                return (
                    <li
                        key={s.key}
                        aria-current={s.state === "running" || s.state === "waiting" ? "step" : undefined}
                        className={`pipe-step step-${s.state} pr-4 min-w-0`}
                    >
                        <Dot step={s} />
                        <div className="min-w-0">
                            <div className={`mt-3 font-semibold text-[15px] ${pending ? "text-muted" : ""}`}>{STEPS[s.key].label}</div>
                            <div className={`label-mono mt-0.5 ${STATE_COLOR[s.state] ?? "text-muted"}`}>{stateWord(s.key, s.state)}</div>
                            <div className="mt-1.5 text-[13px] leading-[1.45] text-muted">{stepDesc(s.key, s.state)}</div>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

// Phone: vertical stepper. Finished steps show their time; only the running step shows a description.
export function MobileStepper({ flow, steps }: { flow: Flow; steps: Step[] }) {
    const timeOf = (key: StepKey) => flow.log.find((r) => r.name === key)?.at ?? null;
    return (
        <ol role="status" aria-live="polite" aria-label="Pipeline">
            {steps.map((s) => {
                const at = s.state === "done" ? timeOf(s.key) : null;
                return (
                    <li
                        key={s.key}
                        aria-current={s.state === "running" ? "step" : undefined}
                        className={`pipe-step step-${s.state} flex gap-3.5 pb-[22px] last:pb-0`}
                    >
                        <Dot step={s} />
                        <div className="flex-1 min-w-0 pt-1.5">
                            <div className="flex gap-3 items-baseline justify-between">
                                <span className={`font-semibold text-[15px] ${isQuiet(s) ? "text-muted" : ""}`}>{STEPS[s.key].label}</span>
                                <span className={`label-mono flex-none ${STATE_COLOR[s.state] ?? "text-muted"}`}>
                                    {stateWord(s.key, s.state)}{at != null && ` · ${clock(at)}`}
                                </span>
                            </div>
                            {s.state === "running" && <div className="mt-1 text-[13px] leading-[1.45] text-muted">{stepDesc(s.key, s.state)}</div>}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

// Phone review: one fixed row of compact chips (no scrolling, no scrollbar).
export function StepChips({ steps }: { steps: Step[] }) {
    return (
        <ol aria-label="Pipeline summary" className="flex flex-nowrap gap-1.5 overflow-hidden">
            {steps.filter((s) => s.key !== "review").map((s) => (
                <li
                    key={s.key}
                    // Skipped = dashed, muted chip (no extra word, so all four fit on a 360px phone).
                    className={`flex-none inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium border ${s.state === "done" ? "bg-accent-soft text-accent border-transparent" : "bg-transparent text-muted border-dashed border-muted"}`}
                >
                    {STEPS[s.key].label}
                    {s.state === "done" && <CheckIcon size={12} />}
                    {s.state === "skipped" && <span className="sr-only">(skipped)</span>}
                </li>
            ))}
        </ol>
    );
}

// One row per finished node, plus a spinner row for the step that is running now.
export function ActivityLog({ flow, steps }: { flow: Flow; steps: Step[] }) {
    const running = steps.find((s) => s.state === "running");
    if (flow.log.length === 0 && !running) return null;
    return (
        <section aria-label="Activity" className="mt-6 bg-surface border border-line rounded-[14px] px-6 py-2">
            <ul>
                {flow.log.map((row) => (
                    <li key={row.name} className="flex gap-4 items-baseline py-2.5 border-t border-line first:border-t-0 text-sm">
                        <span className="font-mono text-xs font-medium text-muted min-w-11">{row.at == null ? "—" : clock(row.at)}</span>
                        <span>{row.name === "approval" ? "Your decision was recorded" : row.name === "publisher" ? "Post saved" : `${STEPS[row.name].label} finished`}</span>
                    </li>
                ))}
                {running && (
                    <li className="flex gap-4 items-baseline py-2.5 border-t border-line first:border-t-0 text-sm text-muted">
                        <span className="font-mono text-xs font-medium min-w-11">now</span>
                        <span className="inline-flex items-center gap-2.5"><Spinner />{STEPS[running.key].log}</span>
                    </li>
                )}
            </ul>
        </section>
    );
}

// Collapsed one-line pipeline for the review and result screens.
export function PipelineSummary({ steps }: { steps: Step[] }) {
    return (
        <ol aria-label="Pipeline summary" className="flex flex-wrap gap-x-7 gap-y-2 items-center px-[18px] py-3 bg-surface border border-line rounded-[14px] text-sm">
            {steps.map((s) => {
                if (s.state === "waiting") {
                    return (
                        <li key={s.key} className="sm:ml-auto inline-flex items-center gap-2 rounded-full bg-accent-soft text-accent px-3 py-1 text-[13px] font-medium">
                            <Spinner size={10} />{STEPS[s.key].label}
                        </li>
                    );
                }
                // Skipped or not reached: just the greyed-out name, no tick, no extra word.
                if (s.state !== "done") {
                    return (
                        <li key={s.key} className="text-muted/70">
                            {STEPS[s.key].label}
                            {s.state === "skipped" && <span className="sr-only"> (skipped)</span>}
                        </li>
                    );
                }
                return (
                    <li key={s.key} className="inline-flex items-center gap-2">
                        <CheckIcon size={16} className="text-accent" />
                        {STEPS[s.key].label}
                        {s.key === "rewriter" && <span className="text-[13px] text-muted">ran once</span>}
                    </li>
                );
            })}
        </ol>
    );
}
