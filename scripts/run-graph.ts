import { graph } from "@/graph";
import { Critique } from "@/graph/state";
import { Command } from "@langchain/langgraph";
import { randomUUID } from "node:crypto";

async function main() {
    const topic = process.argv[2] ?? "benefits of solar panels for homes";
    const thread_id = randomUUID();
    const config = { configurable: { thread_id }, streamMode: "updates" as const, recursionLimit: 25 };

    for await (const chunk of await graph.stream({ topic }, config)) {
        for (const [node, update] of Object.entries(chunk)) {
            console.log(`[${node}] -> ${Object.keys((update ?? {}) as object).join(", ")}`);

            const u = (update ?? {}) as { critique?: Critique | null; finalDraft?: string | null };

            if (node === "critic" && u.critique) {
                console.log(`   score ${u.critique.score} | passed ${u.critique.passed}`);
                u.critique.issues.forEach((issue, n) => console.log(`   ${n + 1}. ${issue}`));
            }
            if (node === "rewriter" && u.finalDraft) {
                console.log("\n----- REWRITE -----\n" + u.finalDraft + "\n-------------------\n");
            }
        }
    }

    const action = process.argv[3] === "reject" ? "reject" : "approve";
    const paused = await graph.getState({ configurable: { thread_id } });
    if (paused.next.includes("approval")) {
        console.log(`\n--- paused at approval, resuming with ${action}`);
        for await (const chunk of await graph.stream(new Command({ resume: {action} }), config)){
            for (const node of Object.keys(chunk)) console.log(`[${node}]`);
        }
    }


    const snap = await graph.getState({ configurable: { thread_id }});
    console.log("\nstate keys:", Object.keys(snap.values));
    console.log("\nsummary:", snap.values.research?.summary);
    console.log("\nsources:", snap.values.research?.sources.length, "| iterations:", snap.values.iterations);
    console.log("\ndraft:\n" + snap.values.draft);
    console.log("\ncritique:");
    console.dir(snap.values.critique, { depth: null });
    console.log("\nfinalDraft:\n" + snap.values.finalDraft);

    let checkpoints = 0;
    for await(const _ of graph.getStateHistory({ configurable: { thread_id }})) checkpoints++;
    console.log("checkpoints", checkpoints);   
}
main();
    