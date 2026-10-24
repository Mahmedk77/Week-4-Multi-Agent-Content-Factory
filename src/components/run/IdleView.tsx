import { Button } from "../Button";
import { ArrowIcon, CircleCheckIcon } from "../icons";
import { Notice } from "../Notice";
import { STEP_ORDER, type StepKey } from "./flow";
import { SHORT_LABEL, STEPS } from "./steps";

const MAX = 200;

type Props = { topic: string; error: string | null; onTopic: (t: string) => void; onStart: () => void };

export function IdleView({ topic, error, onTopic, onStart }: Props) {
    const empty = topic.trim().length === 0;

    return (
        <main className="max-w-[1120px] mx-auto px-5 sm:px-10 pt-6 sm:pt-[72px] pb-10 sm:pb-16">
            <div className="flex flex-wrap gap-6 sm:gap-14 items-start">
                <div className="flex-[1_1_420px] min-w-0">
                    <p className="hidden sm:block label-mono text-xs tracking-[.08em] text-accent mb-4">Multi-agent content factory</p>
                    <h1 className="font-serif font-medium text-[32px] sm:text-[52px] leading-[1.12] sm:leading-[1.08] tracking-[-0.02em] sm:mb-5">
                        From a topic to a reviewed post, with you in the loop.
                    </h1>
                    <p className="sm:hidden mt-3 text-base leading-normal text-muted">
                        Agents research, write and fact-check. You approve before anything is published.
                    </p>
                    <p className="hidden sm:block text-lg leading-relaxed text-muted max-w-[520px]">
                        Specialist agents research, write and fact-check a draft. Then the run stops and waits for you.
                        Nothing is published until you approve it.
                    </p>
                </div>

                <form
                    className="flex-[1_1_380px] min-w-0 bg-surface border border-line rounded-[22px] sm:rounded-2xl shadow-card p-4 sm:p-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!empty) onStart();
                    }}
                >
                    <label htmlFor="topic" className="block font-semibold text-sm mb-2">What should the post be about?</label>
                    <textarea
                        id="topic"
                        value={topic}
                        maxLength={MAX}
                        rows={3}
                        onChange={(e) => onTopic(e.target.value)}
                        onKeyDown={(e) => {
                            // Enter submits, Shift+Enter adds a line.
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                if (!empty) onStart();
                            }
                        }}
                        placeholder="e.g. How solid-state batteries could change electric cars"
                        aria-describedby="topic-count topic-note"
                        className="w-full border border-line bg-bg text-ink rounded-xl px-3.5 sm:px-4 py-3 sm:py-3.5 text-base sm:text-[17px] leading-normal resize-none placeholder:text-muted max-sm:h-[76px]"
                    />
                    <div className="flex justify-end mt-1.5">
                        <span id="topic-count" className="font-mono text-xs text-muted" aria-live="polite">{topic.length} / {MAX}</span>
                    </div>
                    {error && <div className="mt-3"><Notice tone="danger" title="Couldn't start the run">{error}</Notice></div>}
                    <Button type="submit" disabled={empty} className="w-full mt-3 sm:mt-4 max-sm:min-h-[52px] max-sm:rounded-2xl max-sm:text-base">
                        Start run <ArrowIcon size={18} className="sm:hidden" />
                    </Button>
                    <p id="topic-note" className="hidden sm:block text-[13px] text-muted mt-3">
                        A run takes a few tens of seconds. You&apos;ll see each agent finish as it happens.
                    </p>
                </form>
            </div>

            <section aria-label="How a run works" className="mt-8 sm:mt-[72px]">
                <h2 className="label-mono text-muted mb-4">How a run works</h2>

                {/* Phone: one row of five icons. No horizontal scrolling. */}
                <ol className="sm:hidden relative grid grid-cols-5">
                    <span aria-hidden="true" className="absolute left-[10%] right-[10%] top-[22px] h-0.5 bg-line" />
                    {STEP_ORDER.map((key) => <FlowIcon key={key} step={key} />)}
                </ol>
                <p className="sm:hidden text-[13px] text-muted text-center mt-4">Rewrite only runs if the critic finds factual errors.</p>

                {/* Desktop: five cards. */}
                <ol className="hidden sm:grid grid-cols-5 gap-3">
                    {STEP_ORDER.map((key, i) => {
                        const Icon = STEPS[key].icon;
                        return (
                            <li key={key} className="bg-surface border border-line rounded-[14px] p-4">
                                <div className="flex items-center gap-2 text-accent">
                                    <Icon size={16} />
                                    <span className="font-mono text-xs text-muted">{i + 1}</span>
                                </div>
                                <div className="font-semibold mt-2">{STEPS[key].label}</div>
                                <div className="text-[13px] text-muted mt-1 leading-snug">{STEPS[key].todo}</div>
                            </li>
                        );
                    })}
                </ol>
            </section>
        </main>
    );
}

function FlowIcon({ step }: { step: StepKey }) {
    const Icon = step === "critic" ? CircleCheckIcon : STEPS[step].icon;
    const style =
        step === "review" ? "bg-accent border-accent text-accent-ink"
            : step === "rewriter" ? "bg-surface border-dashed border-muted text-muted"
                : "bg-surface border-line text-accent";
    return (
        <li className={`relative flex flex-col items-center gap-2 text-xs font-semibold text-center ${step === "rewriter" ? "text-muted" : ""}`}>
            <span className={`w-11 h-11 rounded-full border grid place-items-center ${style}`}><Icon size={20} /></span>
            {SHORT_LABEL[step]}
        </li>
    );
}
