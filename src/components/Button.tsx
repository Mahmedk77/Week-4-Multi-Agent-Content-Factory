import Link from "next/link";
import { Spinner } from "./icons";

type Variant = "primary" | "secondary" | "quiet";

const BASE =
    "inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-[10px] border font-semibold text-[15px] " +
    "whitespace-nowrap no-underline transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";

const VARIANTS: Record<Variant, string> = {
    primary: "bg-accent text-accent-ink border-transparent hover:brightness-110 disabled:hover:brightness-100",
    secondary: "bg-surface text-ink border-line hover:bg-surface2 disabled:hover:bg-surface",
    quiet: "bg-transparent text-ink border-transparent hover:bg-surface2",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
    return `${BASE} ${VARIANTS[variant]} ${extra}`;
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean; busyLabel?: string };

export function Button({ variant = "primary", busy = false, busyLabel = "Saving…", className = "", children, disabled, ...rest }: ButtonProps) {
    return (
        <button type="button" className={buttonClass(variant, className)} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
            {busy ? (
                <>
                    <Spinner onAccent={variant === "primary"} />
                    {busyLabel}
                </>
            ) : (
                children
            )}
        </button>
    );
}

// The chunkier full-width 52px button used on phone screens.
type MobileButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary"; busy?: boolean; busyLabel?: string };

export function MobileButton({ variant = "primary", busy = false, busyLabel = "Saving…", className = "", children, disabled, ...rest }: MobileButtonProps) {
    return (
        <button
            type="button"
            disabled={disabled || busy}
            aria-busy={busy || undefined}
            className={`flex items-center justify-center gap-2 min-h-[52px] w-full rounded-2xl border font-semibold text-base cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${variant === "primary" ? "bg-accent text-accent-ink border-transparent" : "bg-surface text-ink border-line"} ${className}`}
            {...rest}
        >
            {busy ? <><Spinner onAccent={variant === "primary"} />{busyLabel}</> : children}
        </button>
    );
}

export function MobileButtonLink({ variant = "primary", className = "", ...rest }: React.ComponentProps<typeof Link> & { variant?: "primary" | "secondary" }) {
    return (
        <Link
            className={`flex items-center justify-center gap-2 min-h-[52px] w-full rounded-2xl border font-semibold text-base no-underline ${variant === "primary" ? "bg-accent text-accent-ink border-transparent" : "bg-surface text-ink border-line"} ${className}`}
            {...rest}
        />
    );
}

export function ButtonLink({ variant = "primary", className = "", ...rest }: React.ComponentProps<typeof Link> & { variant?: Variant }) {
    return <Link className={buttonClass(variant, className)} {...rest} />;
}
