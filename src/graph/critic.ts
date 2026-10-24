import { AIMessage } from "@langchain/core/messages";
import { invokeStructured } from "./model";
import { CritiqueSchema, State, StateUpdate } from "./state";

export async function critic(state: State): Promise<StateUpdate> {
    
    const text = state.finalDraft ?? state.draft;
    const research = state.research;
    
    if(!text || !research) throw new Error("Critic: needs a draft and research in state");

    const { data } = await invokeStructured(
        CritiqueSchema,
        [
            ["system", "You are a strict fact-checking editor. Compare the blog post to the research notes and report two separate things. factualErrors: ONLY a claim whose number, name, currency, region or meaning contradicts the notes, or a specific claim (number, statistic, named fact) that appears nowhere in the notes. Quote the phrase from the post and the note it conflicts with. A claim that matches the notes is NOT an error, even if you would word it differently. Rewording a hedge (about, around, approximately, typically) is NOT an error. Changing a hedge into a certainty (for example 'can' to 'always') IS an error, and so is changing a currency or region. Never list a claim you describe as accurate. If there are no real errors, return an empty array. styleNotes: optional suggestions on structure, repetition or clarity; these never count as errors. Ignore the Sources section. Score overall quality from 1 to 10."],
            ["user", `Topic: ${state.topic}\n\nResearch summary: ${research.summary}\n\nKey findings:\n- ${research.keyFindings.join("\n- ")}\n\nPost:\n${text}`],
        ],
        "critic",
    );

    const score = Math.min(10, Math.max(1, Math.round(data.score)));
    const issues = data.factualErrors;
    const passed = issues.length === 0;
        
    return{ 
        critique: { score, issues, styleNotes: data.styleNotes, passed },
        messages: [new AIMessage({ content:`${passed ? "passed" : `${issues.length} factual errors`} (score ${score}/10)`, name: "critic" })]
    }
    }
