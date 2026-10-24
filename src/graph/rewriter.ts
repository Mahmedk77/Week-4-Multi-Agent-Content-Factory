import z from "zod";
import { State, StateUpdate } from "./state";
import { invokeStructured } from "./model";
import { AIMessage } from "@langchain/core/messages";

const RewriteSchema = z.object({
    draft: z.string().describe("The revised blog post in markdown. First line is '# <title>'. No Sources section."),
});

export async function rewriter(state: State): Promise<StateUpdate> {
    
    const current = state.finalDraft ?? state.draft;
    const research = state.research;
    const critique = state.critique;

    if(!current || !research || !critique) throw new Error("Rewriter: needs draft, research and critique in state");

    const body = current.replace(/\n## Sources[\s\S]*$/, "").trim() 

    const { data } = await invokeStructured(
        RewriteSchema,
        [
            ["system", "You are an editor revising a blog post. Fix every listed issue. Remove or correct any claim that is not supported by the research notes. Do not add new facts. Keep the structure and tone. Return the full revised post without a Sources section."],
            ["user", `Research summary: ${research.summary}\n\nKey findings:\n- ${research.keyFindings.join("\n- ")}\n\nIssues to fix:\n- ${critique.issues.join("\n- ")}\n\nPost:\n${body}`],
        ],
        "rewriter"
    )

    if (data.draft.trim().length < 200) throw new Error("Rewriter: revised draft too short");
    const sources = research.sources.map((s) => `- [${s.title}](${s.url})`).join("\n");
    const finalDraft = `${data.draft.trim()}\n\n## Sources\n${sources}`;

    return {
        finalDraft,
        messages: [new AIMessage({content: `rewrote draft (${critique.issues.length} issues addressed)`, name: "rewriter" })]
    }
}