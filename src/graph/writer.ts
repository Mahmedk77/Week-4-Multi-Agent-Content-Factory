import z from "zod";
import { State, StateUpdate } from "./state";
import { invokeStructured } from "./model";
import { AIMessage } from "@langchain/core/messages";

// Block 1, imports and schema
const draftSchema = z.object({
    draft: z.string().describe("Blog post in markdown. First line is '# <title>'. About 400-600 words."),
});

// Block 2, guard and LLM call:
export async function writer(state: State): Promise<StateUpdate> {

    const research = state.research;
    if (!research) throw new Error("Writer: no research ins state");

    const { data } = await invokeStructured(
        draftSchema,
        [
            ["system", "You write a blog post using ONLY the facts in the research notes. Do not add facts or sources."],
            ["user", `Topic: ${state.topic}\n\nSummary: ${research.summary}\n\nKey findings:\n- ${research.keyFindings.join("\n- ")}`],
        ],
        "writer",
        )
// Block 3, enforce and return:
    if(data.draft.trim().length < 200) throw new Error("Writer: draft too short");
    const odd = [...new Set([...data.draft].filter((c) => c.charCodeAt(0) > 127).map((c) => "U+" + c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")))];
    console.log("[writer] non-ASCII chars:", odd.join(" ") || "none");
    const sources = research.sources.map((s) => `- [${s.title}](${s.url})`).join("\n");
    const draft = `${data.draft.trim()}\n\n## Sources\n${sources}`;
    
    return { draft, messages: [new AIMessage({ content: `drafted ${draft.length} chars`, name: "writer" })] }
}






