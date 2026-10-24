import { AlertIcon, CheckIcon, OfflineIcon } from "./icons";

type Tone = "danger" | "warn" | "ok";

const TONES: Record<Tone, { box: string; icon: string }> = {
    danger: { box: "bg-danger-soft border-danger", icon: "text-danger" },
    warn: { box: "bg-warn-soft border-warn", icon: "text-warn" },
    ok: { box: "bg-accent-soft border-accent", icon: "text-accent" },
};

export function Notice({ tone, title, children, offline = false }: { tone: Tone; title: string; children?: React.ReactNode; offline?: boolean }) {
    const Icon = tone === "ok" ? CheckIcon : offline ? OfflineIcon : AlertIcon;
    return (
        <div role={tone === "danger" ? "alert" : "status"} className={`flex gap-3.5 items-start px-[18px] py-4 rounded-xl border text-ink ${TONES[tone].box}`}>
            <Icon size={20} className={`flex-none mt-0.5 ${TONES[tone].icon}`} />
            <div className="min-w-0">
                <div className="font-semibold">{title}</div>
                {children && <div className="text-[13px] mt-1">{children}</div>}
            </div>
        </div>
    );
}
