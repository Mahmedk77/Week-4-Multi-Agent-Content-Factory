"use client";

import { bodyOf, sourceCountOf, wordCount } from "@/lib/text";
import { MobileButton, MobileButtonLink } from "../Button";
import { Dialog } from "../Dialog";
import { CheckIcon, DocIcon } from "../icons";
import type { Flow } from "./flow";

// Phone result: a centered dialog over the (dimmed) review screen. It can only be left through its buttons.
export function ResultDialog({ flow, onStartAnother }: { flow: Flow; onStartAnother: () => void }) {
    const result = flow.result;
    if (!result) return null;
    const published = result.approved;
    const words = flow.draft ? wordCount(bodyOf(flow.draft)) : null;
    const sources = flow.draft ? sourceCountOf(flow.draft) : null;

    return (
        <Dialog
            variant="center"
            role="alertdialog"
            dismissable={false}
            labelledBy="result-title"
            onClose={() => {}}
            className="w-[calc(100vw-40px)] max-w-[420px] rounded-[28px]!"
        >
            <div className="px-6 pt-8 pb-[22px] text-center">
                <div className={`mx-auto mb-[18px] w-16 h-16 rounded-full grid place-items-center ${published ? "bg-accent text-accent-ink" : "bg-surface2 text-ink"}`} aria-hidden="true">
                    {published ? <CheckIcon size={30} /> : <DocIcon size={28} />}
                </div>
                <h2 id="result-title" className="font-serif font-medium text-[28px] leading-[1.15] tracking-[-0.015em] mb-2">
                    {published ? "Approved and published" : "Saved as a draft"}
                </h2>
                <p className="text-[15px] text-muted">
                    {published ? "This version is now live on the Published page." : "Not published. Your edited version is saved in Drafts."}
                </p>
                <div className="mt-[18px] px-3.5 py-3 bg-bg border border-line rounded-[14px] text-left">
                    <div className="font-serif font-semibold text-base leading-[1.3] [overflow-wrap:anywhere]">{result.title}</div>
                    {words != null && <div className="text-[13px] text-muted mt-0.5">{words} words · {sources} {sources === 1 ? "source" : "sources"}</div>}
                </div>
                <div className="grid gap-2.5 mt-5">
                    <MobileButtonLink href={published ? "/published" : "/drafts"}>{published ? "View in Published" : "View in Drafts"}</MobileButtonLink>
                    <MobileButton variant="secondary" onClick={onStartAnother}>Start another</MobileButton>
                </div>
            </div>
        </Dialog>
    );
}
