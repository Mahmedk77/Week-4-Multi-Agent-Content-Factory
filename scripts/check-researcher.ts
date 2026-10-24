import { researcher } from "@/graph/researcher";
import { State } from "@/graph/state";

async function main() {
    const out = await researcher({ topic: "benefit of solar panels for homes"} as unknown as State);
    console.log(out);
    console.log(out.research);
    console.log(out.research?.summary);
    console.log(out.research?.keyFindings);
    console.log(out.research?.sources);
}
main();