"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Post, Source } from "@/lib/run-types";
import { errorMessage } from "@/lib/sse";
import { domainOf, wordCount } from "@/lib/text";
import { Button, MobileButton } from "../Button";
import { Dialog } from "../Dialog";
import { ArrowIcon, BackIcon, ChevronRightIcon, CrossIcon, ExternalIcon, LinkIcon, PenIcon, Spinner, TrashIcon } from "../icons";
import { Markdown } from "../Markdown";
import { useMediaQuery } from "../useMediaQuery";

export type PostItem = {
    id: string;
    title: string;
    status: Post["status"];
    dateLabel: string; // "Published Oct 25, 2026"
    date: string; // "Oct 25, 2026"
    day: string; // "Oct 25"
    sources: Source[];
    words: number;
    preview: string;
    body: string; // display text: no "# Title" line and no Sources section
    content: string; // full markdown, what the draft editor edits and publishes
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function Meta({ p }: { p: PostItem }) {
    return (
        <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[13px] text-muted">
            <span>{p.dateLabel}</span>
            <span>{plural(p.sources.length, "source")}</span>
            <span>{p.words} words</span>
        </div>
    );
}

// Bin on published posts, cross on drafts. Opens the confirm dialog; never deletes on the first click.
function DeleteButton({ post, onClick, className = "" }: { post: PostItem; onClick: () => void; className?: string }) {
    const Icon = post.status === "published" ? TrashIcon : CrossIcon;
    const label = post.status === "published" ? `Delete "${post.title}"` : `Remove draft "${post.title}"`;
    return (
        <button
            type="button"
            aria-label={label}
            title={post.status === "published" ? "Delete post" : "Remove draft"}
            aria-haspopup="dialog"
            onClick={onClick}
            className={`flex-none w-11 h-11 grid place-items-center rounded-[10px] text-muted hover:text-danger hover:bg-danger-soft cursor-pointer ${className}`}
        >
            <Icon size={18} />
        </button>
    );
}

// Desktop: a list box that scrolls by itself + a centered modal.
// Phone: a "Latest" card, an "Earlier" grouped list, and a bottom sheet for reading.
// Nothing opens on page load.
export function PostList({ items: allItems, label }: { items: PostItem[]; label: string }) {
    const router = useRouter();
    const [openId, setOpenId] = useState<string | null>(null);
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const [removed, setRemoved] = useState<string[]>([]); // hidden right away, before the server list refreshes
    const phone = useMediaQuery("(max-width: 639px)");

    const items = allItems.filter((p) => !removed.includes(p.id));
    const open = items.find((p) => p.id === openId) ?? null;
    const confirming = items.find((p) => p.id === confirmId) ?? null;
    const [latest, ...earlier] = items;
    if (!latest) return null; // last one removed: the server refresh shows the empty state

    const onPublished = (id: string) => {
        setOpenId(null);
        setRemoved((r) => [...r, id]);
        router.push("/published");
    };

    const onDeleted = (id: string) => {
        setConfirmId(null);
        setRemoved((r) => [...r, id]);
        router.refresh(); // re-reads the list on the server (count, empty state)
    };

    return (
        <>
            {/* Desktop list */}
            <ul
                aria-label={label}
                tabIndex={0}
                // No flex-1: the box is as tall as its posts, and only scrolls once they don't fit the screen.
                className="hidden sm:block min-h-0 overflow-y-auto overscroll-contain no-scrollbar bg-surface border border-line rounded-2xl shadow-card"
            >
                {items.map((p) => (
                    <li key={p.id} className="px-6 py-5 border-t border-line first:border-t-0">
                        <div className="flex gap-4 items-start justify-between">
                            <div className="min-w-0">
                                <h2 className="font-serif font-semibold text-[21px] leading-[1.3] [overflow-wrap:anywhere]">{p.title}</h2>
                                <div className="mt-1.5"><Meta p={p} /></div>
                            </div>
                            <div className="flex-none flex items-center gap-1">
                                <DeleteButton post={p} onClick={() => setConfirmId(p.id)} />
                                <Button variant="secondary" className="px-3.5 text-sm" aria-haspopup="dialog" onClick={() => setOpenId(p.id)}>
                                    Read
                                </Button>
                            </div>
                        </div>
                        <p className="mt-2.5 text-muted line-clamp-2">{p.preview}</p>
                    </li>
                ))}
            </ul>

            {/* Phone list. Published: a "Latest" card + "Earlier" rows. Drafts: one plain list (drafts rank below published). */}
            <div className="sm:hidden" aria-label={label}>
                {latest.status === "published" && (
                    <div className="relative">
                        <button
                            type="button"
                            aria-haspopup="dialog"
                            onClick={() => setOpenId(latest.id)}
                            className="block w-full text-left px-5 py-[22px] rounded-[22px] bg-accent-soft cursor-pointer"
                        >
                            <span className="label-mono text-accent">Latest · {latest.day}</span>
                            <h2 className="font-serif font-medium text-[26px] leading-[1.16] tracking-[-0.015em] mt-2.5 mb-2 pr-8 [overflow-wrap:anywhere]">{latest.title}</h2>
                            <p className="text-[15px] leading-normal opacity-80 line-clamp-3">{latest.preview}</p>
                            <span className="flex items-center justify-between mt-4">
                                <span className="text-[13px] opacity-75">{plural(latest.sources.length, "source")} · {latest.words} words</span>
                                <span className="inline-flex items-center gap-1.5 font-semibold text-sm text-accent">Read <ArrowIcon size={16} /></span>
                            </span>
                        </button>
                        {/* A sibling, not inside the card button (buttons can't be nested). */}
                        <DeleteButton post={latest} onClick={() => setConfirmId(latest.id)} className="absolute top-2.5 right-2.5" />
                    </div>
                )}

                {latest.status === "published" && earlier.length > 0 && (
                    <h2 className="label-mono text-xs tracking-[.08em] text-muted mt-6 mb-2.5">Earlier</h2>
                )}
                {(latest.status === "draft" || earlier.length > 0) && (
                    <ul className="bg-surface border border-line rounded-[20px] shadow-card overflow-hidden">
                        {(latest.status === "draft" ? items : earlier).map((p) => (
                            <PhoneRow key={p.id} post={p} onOpen={() => setOpenId(p.id)} onDelete={() => setConfirmId(p.id)} />
                        ))}
                    </ul>
                )}
            </div>

            {open && (phone
                ? <ReaderSheet post={open} onClose={() => setOpenId(null)} onPublished={() => onPublished(open.id)} onSaved={() => router.refresh()} />
                : <PostModal post={open} onClose={() => setOpenId(null)} onPublished={() => onPublished(open.id)} onSaved={() => router.refresh()} />)}

            {confirming && <ConfirmDelete post={confirming} onCancel={() => setConfirmId(null)} onDeleted={() => onDeleted(confirming.id)} />}
        </>
    );
}

// One row of the phone list. Drafts use plain (sans-serif) titles so they read as secondary to published posts.
function PhoneRow({ post, onOpen, onDelete }: { post: PostItem; onOpen: () => void; onDelete: () => void }) {
    const draft = post.status === "draft";
    return (
        <li className="flex items-center border-t border-line first:border-t-0">
            <button
                type="button"
                aria-haspopup="dialog"
                onClick={onOpen}
                className={`flex-1 min-w-0 flex gap-3 items-center text-left pl-[18px] pr-1 cursor-pointer ${draft ? "py-3.5" : "py-4"}`}
            >
                <span className="flex-1 min-w-0">
                    <span className={`block [overflow-wrap:anywhere] ${draft ? "font-semibold text-[15px] leading-snug" : "font-serif font-semibold text-[17.5px] leading-[1.3]"}`}>{post.title}</span>
                    <span className="block text-[13px] text-muted mt-1">
                        {draft ? `Saved ${post.day}` : post.day} · {plural(post.sources.length, "source")} · {post.words} words
                    </span>
                </span>
                <ChevronRightIcon size={18} className="flex-none text-muted" />
            </button>
            <DeleteButton post={post} onClick={onDelete} className="mr-2" />
        </li>
    );
}

function StatusChip({ status }: { status: Post["status"] }) {
    return (
        <span className={`label-mono inline-flex rounded-full px-2.5 py-1 ${status === "published" ? "bg-accent-soft text-accent" : "bg-surface2 text-muted"}`}>
            {status === "published" ? "Published" : "Draft"}
        </span>
    );
}

function CloseButton({ onClick }: { onClick: () => void }) {
    return (
        <button type="button" data-no-drag onClick={onClick} aria-label="Close" className="flex-none w-11 h-11 grid place-items-center rounded-full bg-surface2 text-ink cursor-pointer">
            <CrossIcon size={18} />
        </button>
    );
}

// Edit state for one draft: Save draft keeps it a draft, Publish moves it to Published.
// Unsaved edits live here while the reader is open; closing without saving drops them.
function useDraftEditor(post: PostItem, onPublished: () => void, onSaved: () => void) {
    const [text, setTextState] = useState(post.content);
    const [savedText, setSavedText] = useState(post.content);
    const [busyKind, setBusyKind] = useState<null | "save" | "publish">(null);
    const [error, setError] = useState<string | null>(null);
    const [justSaved, setJustSaved] = useState(false);
    const dirty = text !== savedText;

    const setText = (t: string) => {
        setTextState(t);
        setJustSaved(false);
    };

    const send = async (kind: "save" | "publish") => {
        if (busyKind) return;
        if (!text.trim()) { setError("The post can't be empty."); return; }
        setBusyKind(kind);
        setError(null);
        try {
            const res = await fetch(kind === "save" ? `/api/posts/${post.id}` : `/api/posts/${post.id}/publish`, {
                method: kind === "save" ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: text }),
            });
            if (!res.ok) throw new Error(await errorMessage(res));
            if (kind === "publish") { onPublished(); return; } // navigates away; nothing more to do here
            setSavedText(text);
            setJustSaved(true);
            onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : `Could not ${kind === "save" ? "save the draft" : "publish the post"}.`);
        }
        setBusyKind(null);
    };

    const status = busyKind === "save" ? "Saving…" : dirty ? "Unsaved changes" : justSaved ? "Saved" : "";
    return { text, setText, dirty, status, error, busy: busyKind != null, busyKind, save: () => send("save"), publish: () => send("publish") };
}

type DraftEditor = ReturnType<typeof useDraftEditor>;

// The editing area: word count + save status + Edit/Preview, then the markdown text (or its preview) filling the space.
function DraftEditPane({ draft }: { draft: DraftEditor }) {
    const [mode, setMode] = useState<"edit" | "preview">("edit");
    const words = wordCount(draft.text);
    return (
        <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-none flex items-center justify-between gap-3 px-5 sm:px-8 py-2.5 border-b border-line">
                <span className="font-mono text-[13px] text-muted min-w-0 truncate" aria-live="polite">
                    {words} {words === 1 ? "word" : "words"}
                    {draft.status && <span className={draft.dirty ? "text-warn" : "text-accent"}> · {draft.status}</span>}
                </span>
                <div role="group" aria-label="View" className="flex-none inline-flex p-[3px] bg-surface2 rounded-[10px] gap-0.5">
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
            </div>
            {mode === "edit" ? (
                <>
                    <label htmlFor="draft-edit" className="sr-only">Draft text (markdown)</label>
                    <textarea
                        id="draft-edit"
                        value={draft.text}
                        onChange={(e) => draft.setText(e.target.value)}
                        readOnly={draft.busy}
                        spellCheck
                        className={`flex-1 min-h-0 w-full block bg-transparent text-ink px-5 sm:px-8 py-4 sm:py-5 font-mono text-[13.5px] sm:text-[14.5px] leading-[1.75] resize-none no-scrollbar whitespace-pre-wrap focus-visible:outline-offset-[-2px] ${draft.busy ? "opacity-70" : ""}`}
                    />
                </>
            ) : (
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar px-5 sm:px-8 py-5">
                    <Markdown>{draft.text}</Markdown>
                </div>
            )}
        </div>
    );
}

// Bottom of the editor: Save draft (outlined) + Publish (filled), side by side.
function EditorActions({ draft, desktop = false }: { draft: DraftEditor; desktop?: boolean }) {
    const Btn = desktop ? Button : MobileButton;
    return (
        <footer className={`flex-none border-t border-line ${desktop ? "px-8 py-4" : "px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]"}`}>
            {draft.error && <p role="alert" className="text-sm text-danger mb-2.5">{draft.error}</p>}
            <div className="grid grid-cols-2 gap-3">
                <Btn
                    variant="secondary"
                    busy={draft.busyKind === "save"}
                    busyLabel="Saving…"
                    disabled={!draft.dirty || draft.busy}
                    onClick={draft.save}
                    className={desktop ? "w-full" : ""}
                >
                    Save draft
                </Btn>
                <Btn busy={draft.busyKind === "publish"} busyLabel="Publishing…" disabled={draft.busy} onClick={draft.publish} className={desktop ? "w-full" : ""}>
                    Publish
                </Btn>
            </div>
        </footer>
    );
}

function EditButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
    return (
        <button type="button" data-no-drag onClick={onClick} aria-label="Edit draft" title="Edit draft" className={`flex-none w-11 h-11 grid place-items-center rounded-full bg-surface2 text-ink cursor-pointer ${className}`}>
            <PenIcon size={18} />
        </button>
    );
}

// Desktop reader: centered modal, only the body scrolls. Drafts get a pencil that switches to the editor + Publish.
function PostModal({ post, onClose, onPublished, onSaved }: { post: PostItem; onClose: () => void; onPublished: () => void; onSaved: () => void }) {
    const [editing, setEditing] = useState(false);
    const draft = useDraftEditor(post, onPublished, onSaved);
    const isDraft = post.status === "draft";

    return (
        <Dialog
            variant="center"
            labelledBy="post-modal-title"
            onClose={() => { if (!draft.busy) onClose(); }}
            dismissable={!draft.busy}
            className={`w-[min(820px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] ${editing ? "h-[calc(100dvh-24px)]" : ""}`}
        >
            {/* 2px less than the dialog: room for its border, so the dialog itself never scrolls. */}
            <div className={`flex flex-col max-h-[calc(100dvh-26px)] ${editing ? "h-full" : ""}`}>
                {editing ? (
                    <>
                        <header className="flex-none flex gap-3 items-center px-6 pt-5 pb-4 border-b border-line">
                            <button type="button" onClick={() => setEditing(false)} disabled={draft.busy} aria-label="Back to the draft" className="flex-none w-11 h-11 grid place-items-center rounded-full bg-surface2 text-ink cursor-pointer disabled:opacity-60">
                                <BackIcon size={18} />
                            </button>
                            <div className="flex-1 min-w-0">
                                <h2 id="post-modal-title" className="font-serif font-medium text-[26px] leading-[1.15]">Edit draft</h2>
                                <div className="text-[13px] text-muted truncate">{post.title}</div>
                            </div>
                            <CloseButton onClick={onClose} />
                        </header>
                        <DraftEditPane draft={draft} />
                        <EditorActions draft={draft} desktop />
                    </>
                ) : (
                    <>
                        <header className="flex-none flex gap-4 items-start justify-between px-8 pt-6 pb-4 border-b border-line">
                            <div className="min-w-0">
                                <StatusChip status={post.status} />
                                <h2 id="post-modal-title" className="font-serif font-medium text-[32px] leading-[1.15] tracking-[-0.015em] mt-3 [overflow-wrap:anywhere]">
                                    {post.title}
                                </h2>
                                <div className="mt-2"><Meta p={post} /></div>
                            </div>
                            <div className="flex-none flex gap-2">
                                {isDraft && <EditButton onClick={() => setEditing(true)} />}
                                <CloseButton onClick={onClose} />
                            </div>
                        </header>
                        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar px-8 py-6">
                            <Markdown>{post.body}</Markdown>
                            <SourceList sources={post.sources} />
                        </div>
                    </>
                )}
            </div>
        </Dialog>
    );
}

const SHEET_TOP = 56; // the collapsed sheet starts this far from the top of the screen

// Phone reader: near-full-height bottom sheet. Footer: sources + Done (published), or sources, edit, Done (drafts).
// Drag the handle or header: up = full screen (published posts only), down = back / close. Tapping the handle toggles too.
// The draft editor always takes the full screen, with Publish at the bottom.
function ReaderSheet({ post, onClose, onPublished, onSaved }: { post: PostItem; onClose: () => void; onPublished: () => void; onSaved: () => void }) {
    const [view, setView] = useState<"post" | "sources" | "edit">("post");
    const [expanded, setExpanded] = useState(false);
    const [drag, setDrag] = useState<number | null>(null); // finger offset while dragging, null when not dragging
    const dragStart = useRef<{ y: number; moved: boolean } | null>(null);
    const suppressClick = useRef(false); // a drag on the handle must not also count as a tap
    const bodyRef = useRef<HTMLDivElement>(null);
    const draft = useDraftEditor(post, onPublished, onSaved);
    const n = post.sources.length;
    const isDraft = post.status === "draft";
    const expandable = post.status === "published";
    const editing = view === "edit";

    // The browser focuses the first button (the close button) when the dialog opens; start on the text instead.
    useEffect(() => { bodyRef.current?.focus({ preventScroll: true }); }, []);

    const onPointerDown = (e: React.PointerEvent) => {
        if (editing || (e.target as HTMLElement).closest("[data-no-drag]")) return;
        dragStart.current = { y: e.clientY, moved: false };
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag(0);
    };
    const onPointerMove = (e: React.PointerEvent) => {
        const start = dragStart.current;
        if (!start) return;
        let dy = e.clientY - start.y;
        if (Math.abs(dy) > 6) start.moved = true;
        if (dy < 0 && (!expandable || expanded)) dy = dy / 4; // resist pulling further than allowed
        setDrag(dy);
    };
    const onPointerUp = () => {
        const start = dragStart.current;
        const dy = drag ?? 0;
        dragStart.current = null;
        setDrag(null);
        if (!start?.moved) return; // a tap: the handle's onClick handles it
        suppressClick.current = true;
        if (dy < -40 && expandable) setExpanded(true);
        else if (dy > 40 && expanded) setExpanded(false);
        else if (dy > 140 && !expanded) onClose();
    };

    // While dragging, the sheet follows the finger; otherwise it animates to its collapsed or full-screen spot.
    const base = expanded || editing ? 0 : SHEET_TOP;
    const top = Math.max(0, base + (drag ?? 0));
    const style: React.CSSProperties = {
        top,
        height: `calc(100dvh - ${top}px)`,
        borderRadius: top === 0 ? 0 : undefined,
        borderWidth: top === 0 ? 0 : undefined, // full screen: no frame around the edges
        transition: drag === null ? "top .25s ease, height .25s ease, border-radius .25s ease" : "none",
    };
    const dragZone = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, style: { touchAction: "none" as const } };
    const close = () => { if (!draft.busy) onClose(); };

    return (
        <Dialog variant="sheet" labelledBy="reader-title" onClose={close} dismissable={!draft.busy} className="sheet-tall" style={style}>
            <div className={`flex flex-col h-full ${top === 0 ? "pt-[env(safe-area-inset-top)]" : ""}`}>
                {!editing && (
                    <button
                        type="button"
                        {...dragZone}
                        onClick={() => {
                            if (suppressClick.current) { suppressClick.current = false; return; }
                            if (expandable) setExpanded((x) => !x);
                        }}
                        aria-label={expandable ? (expanded ? "Shrink the reader" : "Expand the reader to full screen") : "Drag down to close"}
                        className="flex-none w-full pt-2.5 pb-1.5 grid place-items-center cursor-grab"
                    >
                        <span aria-hidden="true" className="w-[42px] h-[5px] rounded-full bg-line" />
                    </button>
                )}

                {view === "post" && (
                    <>
                        <header {...dragZone} className="flex-none flex gap-3 items-start justify-between px-5 pt-1 pb-3.5 border-b border-line">
                            <div className="min-w-0">
                                <StatusChip status={post.status} />
                                <h2 id="reader-title" className="font-serif font-medium text-[25px] leading-[1.18] tracking-[-0.015em] mt-2.5 mb-1.5 [overflow-wrap:anywhere]">
                                    {post.title}
                                </h2>
                                <div className="text-[13px] text-muted">{post.date} · {plural(n, "source")} · {post.words} words</div>
                            </div>
                            <CloseButton onClick={close} />
                        </header>
                        <div ref={bodyRef} tabIndex={-1} className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar px-5 pt-5 outline-none [&_.prose-draft_p]:text-[17px]">
                            <Markdown>{post.body}</Markdown>
                            <div className="h-6" />
                            <div aria-hidden="true" className="fade-bottom" />
                        </div>
                        {isDraft ? (
                            // Drafts: sources and edit as icon buttons, Done takes the rest of the width.
                            <footer className="flex-none grid grid-cols-[52px_52px_1fr] gap-3 px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))] border-t border-line">
                                <MobileButton variant="secondary" disabled={n === 0} onClick={() => setView("sources")} aria-label={`${plural(n, "source")}`} title={plural(n, "source")}>
                                    <LinkIcon size={20} />
                                </MobileButton>
                                <MobileButton variant="secondary" onClick={() => setView("edit")} aria-label="Edit draft" title="Edit draft">
                                    <PenIcon size={20} />
                                </MobileButton>
                                <MobileButton onClick={close}>Done</MobileButton>
                            </footer>
                        ) : (
                            <footer className="flex-none grid grid-cols-2 gap-3 px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))] border-t border-line">
                                <MobileButton variant="secondary" disabled={n === 0} onClick={() => setView("sources")}>
                                    <LinkIcon size={18} /> {plural(n, "source")}
                                </MobileButton>
                                <MobileButton onClick={close}>Done</MobileButton>
                            </footer>
                        )}
                    </>
                )}

                {view === "edit" && (
                    <>
                        <header className="flex-none flex gap-3 items-center px-4 pt-3 pb-3 border-b border-line">
                            <button type="button" onClick={() => setView("post")} disabled={draft.busy} aria-label="Back to the draft" className="flex-none w-11 h-11 grid place-items-center rounded-full bg-surface2 text-ink cursor-pointer disabled:opacity-60">
                                <BackIcon size={18} />
                            </button>
                            <div className="flex-1 min-w-0">
                                <h2 id="reader-title" className="font-serif font-medium text-[22px] leading-[1.15]">Edit draft</h2>
                                <div className="text-[13px] text-muted truncate">{post.title}</div>
                            </div>
                            <CloseButton onClick={close} />
                        </header>
                        <DraftEditPane draft={draft} />
                        <EditorActions draft={draft} />
                    </>
                )}
                {view === "sources" && (
                    <>
                        <header {...dragZone} className="flex-none flex gap-3 items-center px-4 pt-1 pb-3.5 border-b border-line">
                            <button type="button" data-no-drag onClick={() => setView("post")} aria-label="Back to the post" className="flex-none w-11 h-11 grid place-items-center rounded-full bg-surface2 text-ink cursor-pointer">
                                <BackIcon size={18} />
                            </button>
                            <div className="flex-1 min-w-0">
                                <h2 id="reader-title" className="font-serif font-medium text-[25px] leading-[1.15]">Sources</h2>
                                <div className="text-[13px] text-muted">{plural(n, "link")} · open in a new tab</div>
                            </div>
                            <CloseButton onClick={close} />
                        </header>
                        <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar">
                            {post.sources.map((src) => {
                                const domain = domainOf(src.url);
                                return (
                                    <li key={src.url} className="border-b border-line last:border-b-0">
                                        <a href={src.url} target="_blank" rel="noreferrer" className="flex gap-3.5 items-center px-5 py-3.5 no-underline text-ink">
                                            <span aria-hidden="true" className="flex-none w-10 h-10 rounded-full bg-surface2 grid place-items-center font-semibold uppercase">{domain.charAt(0)}</span>
                                            <span className="flex-1 min-w-0">
                                                <span className="block font-semibold text-[15px] leading-snug [overflow-wrap:anywhere]">{src.title}</span>
                                                <span className="block font-mono text-xs text-muted mt-0.5 truncate">{domain}</span>
                                            </span>
                                            <ExternalIcon size={16} className="flex-none text-muted" />
                                        </a>
                                    </li>
                                );
                            })}
                        </ul>
                        <footer className="flex-none px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))] border-t border-line">
                            <MobileButton onClick={() => setView("post")}>Back to the post</MobileButton>
                        </footer>
                    </>
                )}
            </div>
        </Dialog>
    );
}

function SourceList({ sources }: { sources: Source[] }) {
    if (sources.length === 0) return null;
    return (
        <section className="mt-8 pt-5 border-t border-line">
            <h3 className="label-mono text-muted mb-3">Sources</h3>
            <ol className="flex flex-col gap-2 text-sm list-decimal pl-5 marker:text-muted">
                {sources.map((s) => (
                    <li key={s.url} className="[overflow-wrap:anywhere]">
                        <a href={s.url} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">{s.title}</a>
                    </li>
                ))}
            </ol>
        </section>
    );
}

// "Delete this post?" / "Remove this draft?" — deleting is permanent, so it always asks first.
function ConfirmDelete({ post, onCancel, onDeleted }: { post: PostItem; onCancel: () => void; onDeleted: () => void }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const published = post.status === "published";

    const remove = async () => {
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
            const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
            // 404 means it is already gone (e.g. deleted in another tab): treat it as done.
            if (!res.ok && res.status !== 404) throw new Error(await errorMessage(res));
            onDeleted();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not delete the post");
            setBusy(false);
        }
    };

    return (
        <Dialog variant="center" role="alertdialog" labelledBy="confirm-title" onClose={() => { if (!busy) onCancel(); }} dismissable={!busy} className="w-[min(440px,calc(100vw-40px))]">
            <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-danger-soft text-danger grid place-items-center" aria-hidden="true">
                    {published ? <TrashIcon size={22} /> : <CrossIcon size={22} />}
                </div>
                <h2 id="confirm-title" className="font-serif font-semibold text-2xl leading-[1.2] mt-4">
                    {published ? "Delete this post?" : "Remove this draft?"}
                </h2>
                <p className="text-[15px] text-muted mt-2 [overflow-wrap:anywhere]">
                    &ldquo;{post.title}&rdquo; will be removed from {published ? "Published" : "Drafts"}. This can&apos;t be undone.
                </p>
                {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
                <div className="grid grid-cols-2 gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={busy}
                        className="min-h-11 rounded-[10px] border border-line bg-surface text-ink font-semibold text-[15px] cursor-pointer disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={remove}
                        disabled={busy}
                        aria-busy={busy || undefined}
                        className="min-h-11 inline-flex items-center justify-center gap-2 rounded-[10px] bg-danger text-surface font-semibold text-[15px] cursor-pointer hover:brightness-110 disabled:opacity-70"
                    >
                        {busy ? <><Spinner size={14} /> Deleting…</> : published ? "Delete" : "Remove"}
                    </button>
                </div>
            </div>
        </Dialog>
    );
}
