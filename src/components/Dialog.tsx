"use client";

import { useEffect, useRef } from "react";

type Props = {
    variant: "center" | "sheet"; // centered card, or a bottom sheet that slides up (phones)
    labelledBy: string;
    onClose: () => void;
    dismissable?: boolean; // false: Esc and backdrop clicks do nothing (result dialog)
    role?: "dialog" | "alertdialog";
    className?: string;
    style?: React.CSSProperties; // e.g. the reader sheet's live position while it is dragged
    children: React.ReactNode;
};

// Native <dialog> opened with showModal(): focus is trapped, the page behind is inert,
// and focus returns to the button that opened it when it closes. Mount it to open, unmount to close.
export function Dialog({ variant, labelledBy, onClose, dismissable = true, role = "dialog", className = "", style, children }: Props) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        dialog.showModal();
        return () => dialog.close();
    }, []);

    return (
        <dialog
            ref={ref}
            role={role === "alertdialog" ? "alertdialog" : undefined}
            aria-labelledby={labelledBy}
            // The close event is async: ignore one that arrives after the dialog was reopened (React dev runs effects twice).
            onClose={() => { if (!ref.current?.open) onClose(); }}
            onCancel={(e) => { if (!dismissable) e.preventDefault(); }}
            // A click on the backdrop lands on the <dialog> element itself, not on its content.
            onClick={(e) => { if (dismissable && e.target === e.currentTarget) onClose(); }}
            style={style}
            className={`${variant === "sheet" ? "sheet" : "pop m-auto rounded-2xl"} p-0 overflow-hidden border border-line bg-surface text-ink shadow-card ${className}`}
        >
            {children}
        </dialog>
    );
}
