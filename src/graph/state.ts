import { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import z from "zod";


export const ResearchNotesSchema = z.object({
    summary: z.string(),
    keyFindings: z.array(z.string()),
    sources: z.array(z.object({ title: z.string(), url: z.string()}))
});

export const CritiqueSchema = z.object({
    score: z.number().describe("Quality score, integer from 1 to 10"),
    factualErrors: z.array(z.string()).describe("Only claims whose number, name, currency, region or meaning contradicts the research notes, or specific claims (numbers, statistics, named facts) that appear in the post but nowhere in the notes. Quote the phrase and the note it conflicts with. Empty array if there are none."),
    styleNotes: z.array(z.string()).describe("Optional wording, structure or repetition suggestions. Never factual errors. Empty array if none."),
});

type Judged = z.infer<typeof CritiqueSchema>;
export type ResearchNotes = z.infer<typeof ResearchNotesSchema>;
export type Critique = Pick<Judged, "score" | "styleNotes"> & { issues: string[]; passed: boolean };

export const GraphState = Annotation.Root({
    topic: Annotation<string>(),
    research: Annotation<ResearchNotes | null>(),
    draft: Annotation<string | null>(),
    critique: Annotation<Critique | null>(),
    finalDraft: Annotation<string | null>(),
    approved: Annotation<boolean | null>(),
    published: Annotation<boolean | null>(),

    messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer,
        default: () => [],
    }),
    iterations: Annotation<number>({
        reducer: (_old, next) => next,
        default: () => 0
    }),

})

export type State = typeof GraphState.State;
export type StateUpdate = typeof GraphState.Update