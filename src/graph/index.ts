import { END, START, StateGraph } from "@langchain/langgraph";
import { GraphState } from "./state";
import { decideNext, supervisor } from "./supervisor";
import { researcher } from "./researcher";
import { getCheckpointer } from "./checkpointer";
import { writer } from "./writer";
import { critic } from "./critic";
import { rewriter } from "./rewriter";
import { approval } from "./approval";
import { publisher } from "./publisher";

export const graph = new StateGraph(GraphState)
    .addNode("supervisor", supervisor)
    .addNode("researcher", researcher)
    .addNode("writer", writer)
    .addNode("critic", critic)
    .addNode("rewriter", rewriter)
    .addNode("approval", approval)
    .addNode("publisher", publisher)
    .addEdge(START, "supervisor")
    .addConditionalEdges("supervisor", (s) => decideNext(s).goto, ["researcher", "writer", "critic", "rewriter", "approval", "publisher", END])
    .addEdge("researcher", "supervisor")
    .addEdge("writer", "supervisor")
    .addEdge("critic", "supervisor")
    .addEdge("rewriter", "supervisor")
    .addEdge("approval", "supervisor")
    .addEdge("publisher", "supervisor")
    .compile({ checkpointer: getCheckpointer() });