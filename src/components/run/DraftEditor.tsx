"use client";

import { useEffect, useState } from "react";
import { wordCount } from "@/lib/text";
import { CollapseIcon, ExpandIcon } from "../icons";
import { Markdown } from "../Markdown";

// Draft card: Edit (markdown source) | Preview (rendered). Always editable, except while the decision is saving.
// It fills the height the review screen gives it, and can be expanded to cover the whole window.
export function DraftEditor({ value, onChange, locked }: { value: string; onChange: (text: string) => void; locked: boolean }) {
    const [mode, setMode] = useState<"edit" | "preview">("edit");
    const [expanded, setExpanded] = useState(false);
    const words = wordCount(value);

    // Esc leaves full screen.
    useEffect(() => {
        if (!expanded) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [expanded]);

    return (
        // Same element in both states (only its classes change), so the cursor and scroll position survive the toggle.
        <section
            aria-label="Draft"
            data-editor-expanded={expanded || undefined}
            className={`bg-surface min-w-0 w-full overflow-hidden flex flex-col ${expanded
                ? "fixed inset-0 z-50 pb-[env(safe-area-inset-bottom)]"
                : "flex-1 max-sm:min-h-[200px] sm:min-h-0 border border-line rounded-[22px] sm:rounded-2xl shadow-card"}`}
        >
            <div className="flex-none flex flex-wrap gap-3 items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-b border-line">
                <div className="flex items-baseline gap-3">
                    <h2 className={`${expanded ? "" : "hidden sm:block"} font-serif font-semibold text-xl tracking-[-0.01em]`}>Draft</h2>
                    <span className="font-mono text-[13px] text-muted" aria-live="polite">{words} {words === 1 ? "word" : "words"}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div role="group" aria-label="View" className="inline-flex p-[3px] bg-surface2 rounded-[10px] gap-0.5">
                        {(["edit", "preview"] as const).map((m) => (
                            <button
                                key={m}
                                type="button"
                                aria-pressed={mode === m}
                                onClick={() => setMode(m)}
                                className={`min-h-10 sm:min-h-9 px-4 sm:px-3.5 rounded-lg text-[13px] font-medium cursor-pointer ${mode === m ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,.12)]" : "text-muted"}`}
                            >
                                {m === "edit" ? "Edit" : "Preview"}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => setExpanded((x) => !x)}
                        aria-pressed={expanded}
                        aria-label={expanded ? "Exit full screen" : "Edit in full screen"}
                        title={expanded ? "Exit full screen (Esc)" : "Full screen"}
                        className="w-10 h-10 sm:w-9 sm:h-9 grid place-items-center rounded-[10px] text-muted hover:text-ink hover:bg-surface2 cursor-pointer"
                    >
                        {expanded ? <CollapseIcon size={18} /> : <ExpandIcon size={18} />}
                    </button>
                </div>
            </div>

            {mode === "edit" ? (
                <>
                    <label htmlFor="draft" className="sr-only">Draft text (markdown)</label>
                    <textarea
                        id="draft"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        readOnly={locked}
                        aria-readonly={locked || undefined}
                        spellCheck
                        // Takes all the height left in the card and scrolls inside, without a scrollbar.
                        className={`block w-full flex-1 min-h-0 bg-transparent text-ink p-4 sm:py-[22px] font-mono text-[13.5px] sm:text-[14.5px] leading-[1.75] resize-none no-scrollbar whitespace-pre-wrap focus-visible:outline-offset-[-2px] ${expanded ? "sm:px-[max(24px,calc((100vw-860px)/2))]" : "sm:px-6"} ${locked ? "opacity-70 cursor-not-allowed" : ""}`}
                    />
                </>
            ) : (
                <div className={`flex-1 min-h-0 px-4 py-5 sm:py-7 overflow-y-auto no-scrollbar ${expanded ? "sm:px-[max(32px,calc((100vw-760px)/2))]" : "sm:px-8"}`}>
                    <Markdown>{value}</Markdown>
                </div>
            )}
        </section>
    );
}
