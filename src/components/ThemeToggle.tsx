"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "./icons";

type Theme = "light" | "dark";
const EVENT = "themechange";

function subscribe(onChange: () => void) {
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
}

// The <html data-theme> attribute (set by the script in layout.tsx) is the source of truth.
const current = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

const STYLES = {
    // Desktop nav: a quiet icon button.
    quiet: "min-h-11 w-11 grid place-items-center rounded-lg text-muted hover:text-ink hover:bg-surface2",
    // Mobile top bars: a bordered tile.
    tile: "w-11 h-11 grid place-items-center rounded-[14px] border border-line bg-surface text-ink",
};

export function ThemeToggle({ variant = "quiet" }: { variant?: keyof typeof STYLES }) {
    const theme = useSyncExternalStore(subscribe, current, () => "light" as Theme);
    const next: Theme = theme === "dark" ? "light" : "dark";

    const toggle = () => {
        document.documentElement.dataset.theme = next;
        try {
            localStorage.setItem("theme", next);
        } catch {
            /* storage blocked: the choice just won't be remembered */
        }
        window.dispatchEvent(new Event(EVENT));
    };

    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={`Switch to ${next} mode`}
            title={`Switch to ${next} mode`}
            className={`${STYLES[variant]} flex-none cursor-pointer`}
        >
            {theme === "dark" ? <SunIcon size={variant === "tile" ? 20 : 18} /> : <MoonIcon size={variant === "tile" ? 20 : 18} />}
        </button>
    );
}
