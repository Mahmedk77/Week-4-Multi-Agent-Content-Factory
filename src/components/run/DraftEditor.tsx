"use client";

import { useState } from "react";
import { wordCount } from "@/lib/text";
import { Markdown } from "../Markdown";

// Draft card: Edit (markdown source) | Preview (rendered). Always editable, except while the decision is saving.
export function DraftEditor({ value, onChange, locked }: { value: string; onChange: (text: string) => void; locked: boolean }) {
    const [mode, setMode] = useState<"edit" | "preview">("edit");
    const words = wordCount(value);

    return (
        // Desktop: fills the space the review screen gives it (flex column); the text scrolls inside.
        <section aria-label="Draft" className="bg-surface border border-line rounded-[22px] sm:rounded-2xl shadow-card min-w-0 w-full overflow-hidden sm:flex-1 sm:min-h-0 sm:flex sm:flex-col">
            <div className="flex-none flex flex-wrap gap-3 items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-b border-line">
                <div className="flex items-baseline gap-3">
                    <h2 className="hidden sm:block font-serif font-semibold text-xl tracking-[-0.01em]">Draft</h2>
                    <span className="font-mono text-[13px] text-muted" aria-live="polite">{words} {words === 1 ? "word" : "words"}</span>
                </div>
                <div role="group" aria-label="View" className="inline-flex p-[3px] bg-surface2 rounded-[10px] gap-0.5">
                    {(["edit", "preview"] as const).map((m) => (
                        <button
                            key={m}
                            type="button"
                            aria-pressed={mode === m}
                            onClick={() => setMode(m)}
                            className={`min-h-10 sm:min-h-9 px-[18px] sm:px-3.5 rounded-lg text-[13px] font-medium cursor-pointer ${mode === m ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,.12)]" : "text-muted"}`}
                        >
                            {m === "edit" ? "Edit" : "Preview"}
                        </button>
                    ))}
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
                        // Phone: fixed height. Desktop: takes the rest of the card. Both scroll inside, without a scrollbar.
                        className={`block w-full bg-transparent text-ink p-4 sm:px-6 sm:py-[22px] font-mono text-[13.5px] sm:text-[14.5px] leading-[1.75] max-sm:h-[36dvh] sm:flex-1 sm:min-h-0 resize-none no-scrollbar whitespace-pre-wrap focus-visible:outline-offset-[-2px] ${locked ? "opacity-70 cursor-not-allowed" : ""}`}
                    />
                </>
            ) : (
                <div className="px-4 sm:px-8 py-5 sm:py-7 max-sm:h-[36dvh] sm:flex-1 sm:min-h-0 overflow-y-auto no-scrollbar">
                    <Markdown>{value}</Markdown>
                </div>
            )}
        </section>
    );
}
