"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark, DocCheckIcon, DocLinesIcon, PlusIcon } from "./icons";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
    { href: "/", label: "New", icon: PlusIcon },
    { href: "/published", label: "Published", icon: DocCheckIcon },
    { href: "/drafts", label: "Drafts", icon: DocLinesIcon },
];

export function Brand() {
    return (
        <Link href="/" className="flex items-center gap-2.5 font-serif font-semibold text-[22px] tracking-[-0.01em] text-ink no-underline">
            <span className="w-7 h-7 rounded-lg bg-accent text-accent-ink grid place-items-center">
                <BrandMark />
            </span>
            Draftloom
        </Link>
    );
}

// Desktop: one top bar with links. Phone: wordmark + theme on top, links in a fixed bottom tab bar.
export function Nav() {
    const pathname = usePathname();
    return (
        <>
            <header data-app-chrome className="hidden sm:flex flex-wrap gap-3 items-center justify-between px-10 py-4 border-b border-line">
                <Brand />
                <nav aria-label="Main" className="flex gap-1 items-center">
                    {LINKS.map((l) => {
                        const on = pathname === l.href;
                        return (
                            <Link
                                key={l.href}
                                href={l.href}
                                aria-current={on ? "page" : undefined}
                                className={`min-h-11 inline-flex items-center px-4 rounded-lg text-sm font-medium no-underline ${on ? "bg-surface2 text-ink" : "text-muted hover:text-ink"}`}
                            >
                                {l.label}
                            </Link>
                        );
                    })}
                    <span aria-hidden="true" className="w-px h-6 bg-line mx-1" />
                    <ThemeToggle />
                </nav>
            </header>

            <header data-app-chrome data-mobile-chrome className="sm:hidden flex items-center justify-between px-5 pt-3 pb-2">
                <Brand />
                <ThemeToggle variant="tile" />
            </header>

            <nav
                data-app-chrome
                data-mobile-chrome
                aria-label="Main"
                className="sm:hidden fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 gap-1 px-3 pt-2 pb-[calc(12px+env(safe-area-inset-bottom))] bg-surface border-t border-line"
            >
                {LINKS.map((l) => {
                    const on = pathname === l.href;
                    const Icon = l.icon;
                    return (
                        <Link
                            key={l.href}
                            href={l.href}
                            aria-current={on ? "page" : undefined}
                            className={`min-h-12 flex flex-col items-center gap-1 py-1 rounded-[14px] text-[11px] font-semibold no-underline ${on ? "text-accent" : "text-muted"}`}
                        >
                            <span className={`w-14 h-[30px] rounded-full grid place-items-center ${on ? "bg-accent-soft" : ""}`}>
                                <Icon size={22} />
                            </span>
                            {l.label}
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
