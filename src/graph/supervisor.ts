import { END } from "@langchain/langgraph";
import { State, StateUpdate } from "./state";
import { AIMessage } from "@langchain/core/messages";

export const MAX_ITERATIONS = 10;
export type NextNode = "researcher" | "writer" | "critic" | "rewriter" | "approval" | "publisher" | typeof END;

type Route = { //this one is to create the ts types
    when: (s: State) => boolean;
    goto: NextNode;
    reason: string
};

const ROUTES: Route[] = [ //this is the actual array of route rules
    { when: (s) => !s.research, goto: "researcher", reason: "research is empty" },
    { when:(s) => !s.draft, goto: "writer", reason: "draft is empty"},
    { when: (s) => !s.critique, goto: "critic", reason: "no critique yet" },
    { when: (s) => !!s.critique && !s.critique.passed && !s.finalDraft, goto: "rewriter", reason: "critique failed, no rewrite yet" },
    { when: (s) => s.approved == null, goto: "approval", reason: "waiting for human review"},
    { when: (s) => s.approved != null && s.published == null, goto: "publisher", reason: "human decided, not saved yet" }
];

export function decideNext(state: State): { goto: NextNode; reason: string } {

    if( state.iterations > MAX_ITERATIONS) {
        return { goto: END, reason: `iteration guard hit (${state.iterations} > ${MAX_ITERATIONS})` };
    }
    const hit = ROUTES.find((r) => r.when(state)) //this true means that state field is empty rightnow
    return hit ? { goto: hit.goto, reason: hit.reason } : { goto: END, reason: "all steps are completed"};
}

export async function supervisor(state: State): Promise<StateUpdate> {
    const iterations = state.iterations + 1;
    const { goto, reason } = decideNext({ ...state, iterations});
    return {
        iterations,
        messages: [new AIMessage({ content: `-> ${goto} (${reason})`, name: "supervisor" })]
    }
    
}