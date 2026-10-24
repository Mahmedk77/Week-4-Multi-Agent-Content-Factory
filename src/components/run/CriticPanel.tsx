"use client";

import { useState } from "react";
import type { Critique } from "@/lib/run-types";
import { MobileButton } from "../Button";
import { Dialog } from "../Dialog";
import { CheckIcon, ChevronUpIcon, CrossIcon, ShieldIcon, WarnIcon } from "../icons";

const TITLE = "Issues found in the first draft";

function List({ title, items, tone }: { title: string; items: string[]; tone: "warn" | "soft" }) {
    if (items.length === 0) return null;
    return (
        <>
            <h3 className="text-[13px] font-semibold mt-5 mb-1 flex items-center gap-2">
                {title}
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tone === "warn" ? "bg-warn-soft text-warn" : "bg-surface2 text-ink"}`}>{items.length}</span>
            </h3>
            <ul>
                {items.map((text, i) => (
                    <li key={i} className="flex gap-2.5 py-3 border-t border-line first:border-t-0 text-sm leading-normal">
                        <span aria-hidden="true" className={`flex-none w-1.5 h-1.5 rounded-full mt-2 ${tone === "warn" ? "bg-warn" : "bg-muted"}`} />
                        <span className="min-w-0 [overflow-wrap:anywhere]">{text}</span>
                    </li>
                ))}
            </ul>
        </>
    );
}

function Body({ critique }: { critique: Critique }) {
    return (
        <>
            <div className="flex items-center gap-3.5 mt-5 px-4 py-3.5 bg-surface2 rounded-xl">
                <span className="font-serif font-medium text-[44px] leading-none tracking-[-0.02em]">
                    {critique.score}<span className="text-xl text-muted"> / 10</span>
                </span>
                <span className="text-[13px] text-muted leading-snug">Critic score for the first draft</span>
            </div>

            {critique.passed && (
                <div className="flex gap-2.5 items-start mt-5 px-4 py-3 rounded-xl bg-accent-soft text-ink text-sm">
                    <CheckIcon size={16} className="text-accent flex-none mt-0.5" />
                    <span>No factual errors found against the research notes.</span>
                </div>
            )}

            <List title="Factual issues" items={critique.issues} tone="warn" />
            <List title="Style notes" items={critique.styleNotes} tone="soft" />
        </>
    );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Desktop: a compact, fixed-size summary next to the draft (it never pushes Approve/Reject down).
// The full list of issues opens in a modal. Hidden entirely when there is no critique.
export function CriticPanel({ critique, rewritten }: { critique: Critique | null; rewritten: boolean }) {
    const [open, setOpen] = useState(false);
    if (!critique) return null;
    const issues = critique.issues.length;
    const notes = critique.styleNotes.length;
    const hasDetails = issues > 0 || notes > 0;

    return (
        <aside aria-labelledby="critic-title" className="flex-none bg-surface border border-line rounded-2xl shadow-card p-6">
            <h2 id="critic-title" className="font-serif font-semibold text-xl tracking-[-0.01em]">{TITLE}</h2>
            <p className="text-[13px] text-muted mt-1">
                {rewritten ? "Checked before the automatic rewrite." : "Checked before you saw the draft."}
            </p>

            <div className="flex items-center gap-4 mt-4 px-4 py-3 bg-surface2 rounded-xl">
                <span className="font-serif font-medium text-[38px] leading-none tracking-[-0.02em]">
                    {critique.score}<span className="text-lg text-muted"> / 10</span>
                </span>
                <span className="flex flex-col gap-1 text-[13px]">
                    {issues > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-warn font-medium"><WarnIcon size={14} />{plural(issues, "factual issue")}</span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 text-accent font-medium"><CheckIcon size={14} />No factual issues</span>
                    )}
                    <span className="text-muted">{plural(notes, "style note")}</span>
                </span>
            </div>

            {hasDetails && (
                <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => setOpen(true)}
                    className="mt-4 w-full min-h-11 inline-flex items-center justify-center gap-2 rounded-[10px] border border-line bg-surface text-ink text-sm font-semibold hover:bg-surface2 cursor-pointer"
                >
                    {issues > 0 ? "Show issues" : "Show style notes"}
                </button>
            )}

            {open && (
                <Dialog variant="center" labelledBy="critic-modal-title" onClose={() => setOpen(false)} className="w-[min(560px,calc(100vw-24px))] max-h-[calc(100dvh-24px)]">
                    {/* 2px less than the dialog: room for its border, so the dialog itself never scrolls. */}
                    <div className="flex flex-col max-h-[calc(100dvh-26px)]">
                        <header className="flex-none flex items-start justify-between gap-4 px-7 pt-6 pb-4 border-b border-line">
                            <div>
                                <h2 id="critic-modal-title" className="font-serif font-semibold text-2xl leading-[1.2]">{TITLE}</h2>
                                <p className="text-[13px] text-muted mt-1.5">
                                    {rewritten
                                        ? "This check ran before the automatic rewrite. The draft was rewritten once, so some issues may already be fixed."
                                        : "This check ran before you saw the draft."}
                                </p>
                            </div>
                            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex-none w-11 h-11 grid place-items-center rounded-full bg-surface2 text-ink cursor-pointer">
                                <CrossIcon size={18} />
                            </button>
                        </header>
                        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar px-7 pb-6">
                            <Body critique={critique} />
                        </div>
                        <footer className="flex-none px-7 py-4 border-t border-line">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="w-full min-h-11 rounded-[10px] bg-accent text-accent-ink font-semibold text-[15px] cursor-pointer hover:brightness-110"
                            >
                                Back to the draft
                            </button>
                        </footer>
                    </div>
                </Dialog>
            )}
        </aside>
    );
}

// Phone: a tappable bar under the editor that opens the critique in a bottom sheet.
export function CriticBar({ critique, rewritten }: { critique: Critique | null; rewritten: boolean }) {
    const [open, setOpen] = useState(false);
    if (!critique) return null;
    const n = critique.issues.length;

    return (
        <>
            <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setOpen(true)}
                className={`sm:hidden mt-3 w-full min-h-[60px] flex items-center gap-3 px-4 rounded-[18px] border text-left text-ink cursor-pointer ${n > 0 ? "bg-warn-soft border-warn" : "bg-accent-soft border-accent"}`}
            >
                {n > 0 ? <WarnIcon size={22} className="flex-none text-warn" /> : <ShieldIcon size={22} className="flex-none text-accent" />}
                <span className="flex-1 leading-tight">
                    <strong className="block text-[15px]">{n > 0 ? `${n} factual issue${n === 1 ? "" : "s"}` : `No factual issues · ${critique.score}/10`}</strong>
                    <span className="text-[13px]">{TITLE}</span>
                </span>
                <ChevronUpIcon size={20} className="flex-none" />
            </button>

            {open && (
                <Dialog variant="sheet" labelledBy="critic-sheet-title" onClose={() => setOpen(false)}>
                    <div className="flex flex-col max-h-[calc(100dvh-56px)]">
                        <div aria-hidden="true" className="flex-none w-[42px] h-[5px] rounded-full bg-line mx-auto mt-2.5 mb-1" />
                        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar px-5 pt-2">
                            <div className="flex items-start justify-between gap-3">
                                <h2 id="critic-sheet-title" className="font-serif font-semibold text-2xl leading-[1.2]">{TITLE}</h2>
                                <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex-none w-11 h-11 grid place-items-center rounded-full bg-surface2 text-ink cursor-pointer">
                                    <CrossIcon size={18} />
                                </button>
                            </div>
                            <p className="text-[13px] text-muted mt-1.5">
                                {rewritten ? "Checked before the automatic rewrite, so some issues may already be fixed." : "Checked before you saw the draft."}
                            </p>
                            <Body critique={critique} />
                        </div>
                        <div className="flex-none px-4 pt-3.5 pb-[calc(16px+env(safe-area-inset-bottom))]">
                            <MobileButton onClick={() => setOpen(false)}>Back to the draft</MobileButton>
                        </div>
                    </div>
                </Dialog>
            )}
        </>
    );
}
