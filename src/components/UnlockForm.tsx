"use client";

import { useState } from "react";
import { errorMessage } from "@/lib/sse";
import { Button } from "./Button";
import { BrandMark } from "./icons";

// The passcode screen. data-bare hides the app nav (see globals.css).
export function UnlockForm({ next }: { next: string }) {
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy || !code) return;
        setBusy(true);
        setError(null);
        try {
            const res = await fetch("/api/unlock", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ passcode: code }),
            });
            if (!res.ok) throw new Error(await errorMessage(res));
            window.location.assign(next); // full load, so every page and route sees the new cookie
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
            setCode("");
            setBusy(false);
        }
    };

    return (
        <main data-bare className="min-h-dvh grid place-items-center px-5 py-10">
            <form onSubmit={submit} className="w-full max-w-[400px] bg-surface border border-line rounded-[22px] sm:rounded-2xl shadow-card p-7 sm:p-8">
                <div className="w-11 h-11 rounded-xl bg-accent text-accent-ink grid place-items-center" aria-hidden="true">
                    <BrandMark />
                </div>
                <h1 className="font-serif font-medium text-[30px] leading-[1.15] tracking-[-0.015em] mt-5">Draftloom is private</h1>
                <p className="text-[15px] text-muted mt-2">Enter the passcode to continue.</p>

                <label htmlFor="passcode" className="block font-semibold text-sm mt-6 mb-2">Passcode</label>
                <input
                    id="passcode"
                    type="password"
                    autoComplete="current-password"
                    autoFocus
                    value={code}
                    onChange={(e) => { setCode(e.target.value); setError(null); }}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "passcode-error" : undefined}
                    className={`w-full border bg-bg text-ink rounded-xl px-4 py-3 text-[17px] ${error ? "border-danger" : "border-line"}`}
                />
                {error && <p id="passcode-error" role="alert" className="mt-2 text-sm text-danger">{error}</p>}

                <Button type="submit" busy={busy} busyLabel="Checking…" disabled={!code} className="w-full mt-5 max-sm:min-h-[52px] max-sm:rounded-2xl">
                    Unlock
                </Button>
            </form>
        </main>
    );
}
