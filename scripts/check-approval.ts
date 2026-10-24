import { graph } from "@/graph";
import { Command } from "@langchain/langgraph";
import { randomUUID } from "node:crypto";

const research = {
  summary: "Solar panels cut home electricity bills; tax credits and net metering lower costs, batteries add backup power, and maintenance is modest.",
  keyFindings: [
    "Bills drop 50-80% in sunny states and 30-60% elsewhere",
    "The federal Solar Investment Tax Credit lowers upfront cost",
    "Net metering gives credits for excess power sent to the grid",
    "Battery storage lowers costs about 15% and gives backup during outages",
    "Maintenance averages $300-$850 per year; inverters need replacing every 10-15 years",
  ],
  sources: [],
};

const GOOD = `# Why Solar Panels Make Sense for Homes

Solar panels can cut a home's electricity bill by 50 to 80 percent in sunny states and 30 to 60 percent elsewhere.

## Lower upfront cost
The federal Solar Investment Tax Credit reduces the price of installation, and net metering gives credits for excess power sent back to the grid.

## Backup power
Adding battery storage lowers costs by about 15 percent on average and keeps the lights on during outages.

## Upkeep
Maintenance averages $300 to $850 per year, and inverters need replacing every 10 to 15 years.`;

const BAD = `# Solar Panels

Solar panels are great. Solar panels are great. Solar panels are great for everyone.

Solar panels cure insomnia and make your house worth ten times more. Every panel lasts 100 years with zero maintenance. In the UK, the cost is £12,230 to £22,710.

Solar panels are great.`;

async function main() {
    const action = process.argv[2] === "reject" ? "reject" : "approve";
    const thread_id = randomUUID();
    const config = { configurable: { thread_id }, streamMode: "updates" as const, recursionLimt: 25 };

    console.log("---run 1: until the pause");
    for await (const chunk of await graph.stream(
        {topic: "benefits of solar panels for homes", research, draft: BAD }, config
    )) { for(const node of Object.keys(chunk)) console.log(`[${node}]`)}

    const paused = await graph.getState({ configurable: { thread_id } });
    console.log("next:", paused.next, "| iterations:", paused.values.iterations, "| approved:", paused.values.approved); 

    console.log("--- run2 after pause");
    const resume = { action, editedDraft: `${paused.values.finalDraft}\n\nEDITED BY HUMAN`}
    for await (const chunk of await graph.stream(new Command({ resume }), config)) {
        for (const node of Object.keys(chunk)) console.log(`[${node}]`);
    }

    const done = await graph.getState({ configurable: {thread_id} });
    console.log("next:", done.next, "| iterations:", done.values.iterations, "| approved:", done.values.approved);
    console.log("finalDraft ends with:", JSON.stringify(done.values.finalDraft?.slice(-30)))

}


main();