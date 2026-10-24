import { State } from "@/graph/state";
import { decideNext } from "@/graph/supervisor";


const fake = (p: Record<string, unknown>) => ({ iterations: 0, ...p}) as unknown as State; //Record<K, V> keys K and values of type V
//as unknown as State is called type assertions
console.log(decideNext(fake({})));
console.log(decideNext(fake({ research: { summary: "s", keyFindings: [], sources: []}})));
console.log(decideNext(fake({iterations:11})));