import { invokeStructured } from "@/graph/model";
import z from "zod";

const Schema = z.object({ queries: z.array(z.string())});

async function main() {
    const { data, provider } = await invokeStructured(
        Schema,
        [["user", "Give me 3 short web search queries about solar panels."]],
        "model-check"
    );
    console.log(provider, data)
}

main();