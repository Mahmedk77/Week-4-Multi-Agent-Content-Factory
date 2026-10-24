import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { State, StateUpdate } from "./state";
import { createClient } from "@supabase/supabase-js";
import { AIMessage } from "@langchain/core/messages";


function getClient() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if(!url || !key) throw new Error("Publisher: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing");
    return createClient(url, key, { auth: { persistSession: false } })
}

export function extractTitle(content: string): string{
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : "Untitled";
}


export async function publisher(state: State, config: LangGraphRunnableConfig ): Promise<StateUpdate> {
    
    const content = state.finalDraft ?? state.draft;
    const thread_id = config.configurable?.thread_id as string | undefined;
    const approved = state.approved;

    if (!content) throw new Error("Publisher: nothing to save");
    if (!thread_id) throw new Error("Publisher: no thread_id in config");
    if (approved == null) throw new Error("Publisher: no human decision yet");

    const row = {
        thread_id,
        title: extractTitle(content),
        content,
        research_sources: state.research?.sources ?? [],
        status: approved ? "published": "draft",
        published_at: approved ? new Date().toISOString(): null
    }

    const { error } = await getClient().from("posts").upsert(row, { onConflict: "thread_id" });
    if (error) throw new Error(`Publisher: save failed: ${error.message}`);

    return {
        published: approved,
        messages: [new AIMessage({  content: `saved as ${row.status}`, name: "publisher" })]
    }

}