import z from "zod";
import { Critique, State, StateUpdate } from "./state";
import { interrupt } from "@langchain/langgraph";
import { AIMessage } from "@langchain/core/messages";

export const ReviewSchema = z.object({
    action: z.enum(["approve", "reject"]),
    editedDraft: z.string().optional(),
});

export type ReviewInput = z.infer<typeof ReviewSchema>;

export type ReviewRequest = {
    topic: string;
    draft: string;
    critique: Critique | null;
    rewritten: boolean; // true if the rewriter ran (only it sets finalDraft before this node)
}

export async function approval(state: State): Promise<StateUpdate> {
    const current = state.finalDraft ?? state.draft;
    if (!current) throw new Error("Approval: nothing to review");

    const request: ReviewRequest = {
        topic: state.topic,
        draft: current,
        critique: state.critique ?? null,
        rewritten: state.finalDraft != null,
    };
    const review = ReviewSchema.parse(interrupt(request));

    const finalDraft = review.editedDraft?.trim() || current;
    const approved = review.action === "approve";

    return {
        finalDraft,
        approved,
        messages: [new AIMessage({ content: approved ? "approved by human": "rejected by human (kept as draft)", name: "approval"})]
    }
}
