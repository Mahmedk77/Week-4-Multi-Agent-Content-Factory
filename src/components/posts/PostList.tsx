"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Post, Source } from "@/lib/run-types";
import { errorMessage } from "@/lib/sse";
import { domainOf } from "@/lib/text";
import { Button, MobileButton } from "../Button";
import { Dialog } from "../Dialog";
import { ArrowIcon, BackIcon, ChevronRightIcon, CrossIcon, ExternalIcon, LinkIcon, Spinner, TrashIcon } from "../icons";
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
    body: string;
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

            {/* Phone list */}
            <div className="sm:hidden" aria-label={label}>
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

                {earlier.length > 0 && (
                    <>
                        <h2 className="label-mono text-xs tracking-[.08em] text-muted mt-6 mb-2.5">Earlier</h2>
                        <ul className="bg-surface border border-line rounded-[20px] shadow-card overflow-hidden">
                            {earlier.map((p) => (
                                <li key={p.id} className="flex items-center border-t border-line first:border-t-0">
                                    <button
                                        type="button"
                                        aria-haspopup="dialog"
                                        onClick={() => setOpenId(p.id)}
                                        className="flex-1 min-w-0 flex gap-3 items-center text-left pl-[18px] pr-1 py-4 cursor-pointer"
                                    >
                                        <span className="flex-1 min-w-0">
                                            <span className="block font-serif font-semibold text-[17.5px] leading-[1.3] [overflow-wrap:anywhere]">{p.title}</span>
                                            <span className="block text-[13px] text-muted mt-1">{p.day} · {plural(p.sources.length, "source")} · {p.words} words</span>
                                        </span>
                                        <ChevronRightIcon size={18} className="flex-none text-muted" />
                                    </button>
                                    <DeleteButton post={p} onClick={() => setConfirmId(p.id)} className="mr-2" />
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>

            {open && (phone
                ? <ReaderSheet post={open} onClose={() => setOpenId(null)} />
                : <PostModal post={open} onClose={() => setOpenId(null)} />)}

            {confirming && <ConfirmDelete post={confirming} onCancel={() => setConfirmId(null)} onDeleted={() => onDeleted(confirming.id)} />}
        </>
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
        <button type="button" onClick={onClick} aria-label="Close" className="flex-none w-11 h-11 grid place-items-center rounded-full bg-surface2 text-ink cursor-pointer">
            <CrossIcon size={18} />
        </button>
    );
}

// Desktop reader: centered modal, only the body scrolls.
function PostModal({ post, onClose }: { post: PostItem; onClose: () => void }) {
    return (
        <Dialog variant="center" labelledBy="post-modal-title" onClose={onClose} className="w-[min(820px,calc(100vw-24px))] max-h-[calc(100dvh-24px)]">
            {/* 2px less than the dialog: room for its border, so the dialog itself never scrolls. */}
            <div className="flex flex-col max-h-[calc(100dvh-26px)]">
                <header className="flex-none flex gap-4 items-start justify-between px-8 pt-6 pb-4 border-b border-line">
                    <div className="min-w-0">
                        <StatusChip status={post.status} />
                        <h2 id="post-modal-title" className="font-serif font-medium text-[32px] leading-[1.15] tracking-[-0.015em] mt-3 [overflow-wrap:anywhere]">
                            {post.title}
                        </h2>
                        <div className="mt-2"><Meta p={post} /></div>
                    </div>
                    <CloseButton onClick={onClose} />
                </header>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar px-8 py-6">
                    <Markdown>{post.body}</Markdown>
                    <SourceList sources={post.sources} />
                </div>
            </div>
        </Dialog>
    );
}

// Phone reader: near-full-height bottom sheet. "N sources" swaps the body for the sources view.
function ReaderSheet({ post, onClose }: { post: PostItem; onClose: () => void }) {
    const [view, setView] = useState<"post" | "sources">("post");
    const bodyRef = useRef<HTMLDivElement>(null);
    const n = post.sources.length;

    return (
        <Dialog variant="sheet" labelledBy="reader-title" onClose={onClose} className="sheet-tall">
            <div className="flex flex-col h-full">
                <div aria-hidden="true" className="flex-none w-[42px] h-[5px] rounded-full bg-line mx-auto mt-2.5 mb-1" />

                {view === "post" ? (
                    <>
                        <header className="flex-none flex gap-3 items-start justify-between px-5 pt-2 pb-3.5 border-b border-line">
                            <div className="min-w-0">
                                <StatusChip status={post.status} />
                                <h2 id="reader-title" className="font-serif font-medium text-[25px] leading-[1.18] tracking-[-0.015em] mt-2.5 mb-1.5 [overflow-wrap:anywhere]">
                                    {post.title}
                                </h2>
                                <div className="text-[13px] text-muted">{post.date} · {plural(n, "source")} · {post.words} words</div>
                            </div>
                            <CloseButton onClick={onClose} />
                        </header>
                        <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar px-5 pt-5 [&_.prose-draft_p]:text-[17px]">
                            <Markdown>{post.body}</Markdown>
                            <div className="h-6" />
                            <div aria-hidden="true" className="fade-bottom" />
                        </div>
                        <footer className="flex-none grid grid-cols-2 gap-3 px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))] border-t border-line">
                            <MobileButton variant="secondary" disabled={n === 0} onClick={() => setView("sources")}>
                                <LinkIcon size={18} /> {plural(n, "source")}
                            </MobileButton>
                            <MobileButton onClick={onClose}>Done</MobileButton>
                        </footer>
                    </>
                ) : (
                    <>
                        <header className="flex-none flex gap-3 items-center px-4 pt-2 pb-3.5 border-b border-line">
                            <button type="button" onClick={() => setView("post")} aria-label="Back to the post" className="flex-none w-11 h-11 grid place-items-center rounded-full bg-surface2 text-ink cursor-pointer">
                                <BackIcon size={18} />
                            </button>
                            <div className="flex-1 min-w-0">
                                <h2 id="reader-title" className="font-serif font-medium text-[25px] leading-[1.15]">Sources</h2>
                                <div className="text-[13px] text-muted">{plural(n, "link")} · open in a new tab</div>
                            </div>
                            <CloseButton onClick={onClose} />
                        </header>
                        <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar">
                            {post.sources.map((s) => {
                                const domain = domainOf(s.url);
                                return (
                                    <li key={s.url} className="border-b border-line last:border-b-0">
                                        <a href={s.url} target="_blank" rel="noreferrer" className="flex gap-3.5 items-center px-5 py-3.5 no-underline text-ink">
                                            <span aria-hidden="true" className="flex-none w-10 h-10 rounded-full bg-surface2 grid place-items-center font-semibold uppercase">{domain.charAt(0)}</span>
                                            <span className="flex-1 min-w-0">
                                                <span className="block font-semibold text-[15px] leading-snug [overflow-wrap:anywhere]">{s.title}</span>
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
