import { Button, MobileButton } from "../Button";
import { Spinner } from "../icons";
import { Notice } from "../Notice";
import type { Flow, Step } from "./flow";
import { stepOfNode } from "./flow";
import { ActivityLog, MobileStepper, Pipeline } from "./Pipeline";
import { STEPS } from "./steps";

type Props = { flow: Flow; steps: Step[]; onContinue: () => void; onStartOver: () => void };

export function ProgressView({ flow, steps, onContinue, onStartOver }: Props) {
    const { problem } = flow;
    const failedStep = problem?.kind === "failed" ? stepOfNode(problem.error.node) ?? steps.find((s) => s.state === "error")?.key : null;
    const savingFailed = problem?.kind === "failed" && problem.error.node === "publisher";
    const failTitle = savingFailed ? "Saving the post failed" : `The run failed at ${failedStep ? STEPS[failedStep].the : "an unknown step"}`;
    const retryLabel = savingFailed ? "Retry saving" : `Retry from ${failedStep ? STEPS[failedStep].label.toLowerCase() : "the failed step"}`;

    return (
        <>
            {/* ---------- Phone ---------- */}
            <main className="sm:hidden px-5 pt-4 pb-8">
                {problem?.kind === "lost" && (
                    <div className="mb-4">
                        <Notice tone="warn" offline title="Connection lost">The run is saved on the server.</Notice>
                    </div>
                )}
                {!problem && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft text-accent px-3 py-1 text-[13px] font-medium">
                        <Spinner size={10} /> Run in progress
                    </span>
                )}
                {problem?.kind === "failed" && (
                    <span className="inline-flex rounded-full bg-danger-soft text-danger px-3 py-1 text-[13px] font-medium">Run failed</span>
                )}

                <h1 className={`font-serif font-medium text-[27px] leading-[1.15] tracking-[-0.015em] [overflow-wrap:anywhere] ${problem?.kind === "lost" ? "" : "mt-3"}`}>
                    {flow.topic}
                </h1>

                <section aria-label="Pipeline" className="mt-5 bg-surface border border-line rounded-[22px] shadow-card px-5 py-[22px]">
                    <MobileStepper flow={flow} steps={steps} />
                </section>

                {!problem && (
                    <p className="text-[13px] text-muted text-center mt-4 mx-1">
                        You can leave this screen on. It moves to review when the agents finish.
                    </p>
                )}

                {problem?.kind === "failed" && (
                    <div className="mt-4">
                        <Notice tone="danger" title={failTitle}>
                            <div className="font-mono text-xs mt-1 [overflow-wrap:anywhere]">{problem.error.message}</div>
                        </Notice>
                        <MobileButton className="mt-4" onClick={onContinue}>Try again</MobileButton>
                        <p className="text-[13px] text-muted text-center mt-3">
                            {savingFailed ? "Retries saving your decision." : "Picks up at the failed step. Finished steps are kept."}
                        </p>
                        <button type="button" onClick={onStartOver} className="block mx-auto mt-1 min-h-11 px-4 text-sm font-semibold text-accent cursor-pointer">
                            Start over with the same topic
                        </button>
                    </div>
                )}

                {problem?.kind === "lost" && (
                    <div className="mt-4">
                        <MobileButton onClick={onContinue}>Reconnect</MobileButton>
                        <p className="text-[13px] text-muted text-center mt-3">Picks up where the run stopped.</p>
                    </div>
                )}
            </main>

            {/* ---------- Desktop ---------- */}
            <main className="hidden sm:block max-w-[1120px] mx-auto px-10 pt-14 pb-16">
                <p className="label-mono text-xs tracking-[.08em] text-accent mb-4">
                    {problem ? "Run stopped" : "Run in progress"}
                </p>
                <h1 className="font-serif font-medium text-[38px] leading-[1.15] tracking-[-0.015em] mb-1.5 max-w-[800px] [overflow-wrap:anywhere]">
                    {flow.topic}
                </h1>
                <p className="text-[13px] text-muted mb-8">The agents run in order. You&apos;ll review the draft when they&apos;re done.</p>

                {problem && (
                    <div className="mb-6 flex flex-col gap-4">
                        {problem.kind === "failed" ? (
                            <Notice tone="danger" title={failTitle}>
                                <div className="font-mono text-xs mt-1 [overflow-wrap:anywhere]">{problem.error.message}</div>
                            </Notice>
                        ) : (
                            <Notice tone="warn" offline title="Connection lost">
                                The run is saved on the server. Continue to pick it up where it stopped.
                            </Notice>
                        )}
                        <div className="flex flex-wrap gap-3 items-center">
                            <Button onClick={onContinue}>{problem.kind === "lost" ? "Continue the run" : retryLabel}</Button>
                            <Button variant="secondary" onClick={onStartOver}>Start over</Button>
                            <span className="text-[13px] text-muted">
                                {problem.kind === "lost" ? "Finished steps are kept." : "Retry keeps the finished steps. Start over begins a new run with the same topic."}
                            </span>
                        </div>
                    </div>
                )}

                <section aria-label="Pipeline" className="bg-surface border border-line rounded-2xl shadow-card px-8 pt-9 pb-8">
                    <Pipeline steps={steps} />
                </section>

                <ActivityLog flow={flow} steps={steps} />
            </main>
        </>
    );
}
