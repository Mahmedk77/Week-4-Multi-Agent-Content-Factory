import { graph } from "@/graph";
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
const BAD = `# Solar Panels

Solar panels are great. Solar panels are great. Solar panels are great for everyone.

Solar panels cure insomnia and make your house worth ten times more. Every panel lasts 100 years with zero maintenance. In the UK, the cost is £12,230 to £22,710.

Solar panels are great.`;

async function main() {
  const thread_id = randomUUID();
  const config = { configurable: { thread_id }, streamMode: "updates" as const, recursionLimit: 25 };

  for await (const chunk of await graph.stream(
    { topic: "benefits of solar panels for homes", research, draft: BAD },
    config,
  )) {
    for (const node of Object.keys(chunk)) console.log(`[${node}]`);
  }

  const snap = await graph.getState({ configurable: { thread_id } });
  console.log("\niterations:", snap.values.iterations);
  console.dir(snap.values.critique, { depth: null });
  console.log("\nfinalDraft:\n" + snap.values.finalDraft);

  let checkpoints = 0;
  for await (const _ of graph.getStateHistory({ configurable: { thread_id } })) checkpoints++;
  console.log("checkpoints", checkpoints);
}
main();