import { Button, MobileButton } from "../Button";
import { Notice } from "../Notice";
import type { Decision, Flow } from "./flow";

type Props = {
    flow: Flow;
    onDecide: (d: Decision) => void;
    onRetrySave: () => void;
};

// Phone: fixed bottom bar. Approve on top, Reject below, one caption. Same locking rules as desktop.
export function MobileDecisionBar({ flow, onDecide, onRetrySave }: Props) {
    const { saving, submitError } = flow;
    const locked = saving != null || submitError?.retrySave === true;

    return (
        <section aria-label="Decision" className="sm:hidden fixed inset-x-0 bottom-0 z-20 bg-surface border-t border-line px-4 pt-3.5 pb-[calc(20px+env(safe-area-inset-bottom))]">
            {submitError?.retrySave ? (
                <MobileButton busy={saving != null} onClick={onRetrySave}>Retry saving</MobileButton>
            ) : (
                <>
                    <MobileButton busy={saving === "approve"} disabled={locked} onClick={() => onDecide("approve")}>Approve</MobileButton>
                    <MobileButton variant="secondary" className="mt-2.5" busy={saving === "reject"} disabled={locked} onClick={() => onDecide("reject")}>Reject</MobileButton>
                </>
            )}
            <p className="text-[13px] text-muted text-center mt-3">
                {saving ? "Saving your version. Editing is paused." : "Not ready? Rejecting saves your version to Drafts."}
            </p>
        </section>
    );
}

// Desktop: Approve over Reject, full width, under the critic panel. Both lock after one click
// (a second resume would silently do nothing).
export function DecisionBar({ flow, onDecide, onRetrySave }: Props) {
    const { saving, submitError } = flow;
    const locked = saving != null || submitError?.retrySave === true;

    return (
        <section aria-label="Decision" className="flex-none flex flex-col gap-2.5">
            {submitError && (
                <Notice tone="danger" title="Couldn't save your decision">
                    {submitError.retrySave
                        ? "Your decision was recorded, but saving the post failed. Retry to save it."
                        : "Your edits are still in the draft. Nothing was lost."}
                    <div className="font-mono text-xs mt-2 [overflow-wrap:anywhere]">{submitError.message}</div>
                </Notice>
            )}
            {submitError?.retrySave ? (
                <Button busy={saving != null} onClick={onRetrySave} className="w-full">Retry saving</Button>
            ) : (
                <>
                    <Button busy={saving === "approve"} disabled={locked} onClick={() => onDecide("approve")} className="w-full">Approve</Button>
                    <Button variant="secondary" busy={saving === "reject"} disabled={locked} onClick={() => onDecide("reject")} className="w-full">Reject</Button>
                </>
            )}
        </section>
    );
}
