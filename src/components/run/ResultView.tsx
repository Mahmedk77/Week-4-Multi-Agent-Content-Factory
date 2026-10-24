import { Button, ButtonLink } from "../Button";
import { CheckIcon, DocIcon } from "../icons";
import type { Flow, Step } from "./flow";
import { PipelineSummary } from "./Pipeline";

export function ResultView({ flow, steps, onStartAnother }: { flow: Flow; steps: Step[]; onStartAnother: () => void }) {
    const result = flow.result;
    if (!result) return null;
    const published = result.approved;

    return (
        <main className="max-w-[760px] mx-auto px-4 sm:px-10 pt-12 sm:pt-16 pb-16">
            <section className="bg-surface border border-line rounded-2xl shadow-card px-6 sm:px-10 py-9 text-center">
                <div
                    className={`mx-auto w-14 h-14 rounded-full grid place-items-center ${published ? "bg-accent text-accent-ink" : "bg-surface2 text-ink"}`}
                    aria-hidden="true"
                >
                    {published ? <CheckIcon size={26} /> : <DocIcon size={24} />}
                </div>
                <h1 className="font-serif font-medium text-[30px] sm:text-[36px] leading-[1.15] tracking-[-0.015em] mt-5" role="status">
                    {published ? "Approved and published" : "Saved as a draft"}
                </h1>
                <p className="text-muted mt-2">
                    {published ? "This version is now live on the Published page." : "Not published. Your edited version is saved in Drafts."}
                </p>
                <div className="mt-6 px-4 py-3.5 bg-bg border border-line rounded-xl text-left">
                    <div className="label-mono text-muted">Post title</div>
                    <div className="font-serif font-semibold text-xl mt-1 [overflow-wrap:anywhere]">{result.title}</div>
                </div>
                <div className="flex flex-wrap gap-3 justify-center mt-7">
                    <ButtonLink href={published ? "/published" : "/drafts"}>{published ? "View in Published" : "View in Drafts"}</ButtonLink>
                    <Button variant="secondary" onClick={onStartAnother}>Start another</Button>
                </div>
            </section>
            <div className="mt-6">
                <PipelineSummary steps={steps} />
            </div>
        </main>
    );
}
