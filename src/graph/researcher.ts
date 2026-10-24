import { TavilySearch } from "@langchain/tavily";
import z from "zod";
import { ResearchNotesSchema, State, StateUpdate } from "./state";
import { invokeStructured } from "./model";
import { AIMessage } from "@langchain/core/messages";

const QueriesSchema = z.object({
    queries: z.array(z.string()).describe(
        "Exactly 3 distinct web search queries, each covering a different angle of the topic"
    ),
});

type SearchHit = { title: string, url:string,content: string };

async function searchOne(query: string): Promise<SearchHit[]>{
    const tool = new TavilySearch({ maxResults: 3 });
    const res = await tool.invoke({ query });
    if ("error" in res) throw new Error(String(res.error));
    return res.results;
}

export async function researcher(state: State): Promise<StateUpdate> {

    const { data: q } = await invokeStructured(
        QueriesSchema,
        [
            ["system", "You write web search queries for a researcher."],
            ["user", `Topic: ${state.topic}`],
        ],
        "researcher-queries"
    );
    
    const queries = q.queries.slice(0,3);
    const settled = await Promise.allSettled(queries.map(searchOne));

    const hits = new Map<string, SearchHit>();
    settled.forEach((s, i) => {
    if (s.status === "fulfilled") s.value.forEach((h, i) => hits.set(h.url, h))
    else console.warn(`[researcher] search ${i + 1} failed: ${(s.reason as Error).message.slice(0, 100)}`);
    });
    if (hits.size === 0) throw new Error("Researcher: no search results (all searches failed or came back empty)");
    
    const sourcesText = [...hits.values()]
    .map((h, i) => `[${i + 1}] ${h.title} (${h.url})\n${h.content}`)
    .join("\n\n");

    const { data } = await invokeStructured(
        ResearchNotesSchema,
        [
            ["system", "Synthesize the sources into structured research notes. Only list sources that appear in the provided sources, using their exact URLs."],
            ["user", `Topic: ${state.topic}\n\nSources:\n${sourcesText}`],
        ],
        "researcher-notes"
    );

    const research = { ...data, sources: data.sources.filter((s) => hits.has(s.url))};

    return {
        research,
        messages: [new AIMessage({ content: `researched ${hits.size} unique results`, name: "researcher" })] 
    }
}

