import { closeCheckPointer, getCheckpointer } from "@/graph/checkpointer";

async function main() {
    await getCheckpointer().setup();
    console.log("checkpointer tables ready");
    await closeCheckPointer();
}

main();