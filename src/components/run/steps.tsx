import { PenIcon, PersonIcon, RewriteIcon, SearchIcon, ShieldIcon } from "../icons";
import type { StepKey, StepState } from "./flow";

type Meta = {
    label: string;
    the: string; // used in "The run failed at <the>"
    icon: (p: { size?: number }) => React.ReactElement;
    todo: string;
    working: string;
    done: string;
    log: string; // activity row while running
};

export const STEPS: Record<StepKey, Meta> = {
    researcher: {
        label: "Researcher", the: "the researcher", icon: SearchIcon,
        todo: "Searches the web and writes notes.", working: "Searching the web and writing notes.",
        done: "Searched the web and wrote notes.", log: "Researcher is searching the web",
    },
    writer: {
        label: "Writer", the: "the writer", icon: PenIcon,
        todo: "Drafts the post from the notes.", working: "Drafting the post from the notes.",
        done: "Drafted the post from the notes.", log: "Writer is drafting the post",
    },
    critic: {
        label: "Critic", the: "the critic", icon: ShieldIcon,
        todo: "Fact-checks the draft against the notes.", working: "Fact-checking the draft against the notes.",
        done: "Fact-checked the draft against the notes.", log: "Critic is checking the draft",
    },
    rewriter: {
        label: "Rewriter", the: "the rewriter", icon: RewriteIcon,
        todo: "Runs only if the critic finds factual errors.", working: "Fixing the critic's factual issues.",
        done: "Fixed the factual issues once.", log: "Rewriter is fixing the factual issues",
    },
    review: {
        label: "Your review", the: "saving your decision", icon: PersonIcon,
        todo: "The run pauses so you can edit and decide.", working: "Preparing the draft for you.",
        done: "You made the call.", log: "Preparing the review",
    },
};

export function stateWord(key: StepKey, state: StepState): string {
    switch (state) {
        case "done": return "Done";
        case "running": return key === "review" ? "Preparing" : "Working";
        case "skipped": return "Skipped";
        case "error": return "Failed";
        case "waiting": return "Waiting for you";
        case "unknown": return "Status unknown";
        case "pending": return key === "rewriter" ? "If needed" : "Up next";
        case "blocked": return key === "rewriter" ? "Not run" : "Not reached";
    }
}

// Short labels for the phone "How a run works" row.
export const SHORT_LABEL: Record<StepKey, string> = {
    researcher: "Research", writer: "Write", critic: "Check", rewriter: "Rewrite", review: "You",
};

export function stepDesc(key: StepKey, state: StepState): string {
    const m = STEPS[key];
    if (state === "done") return m.done;
    if (state === "running") return m.working;
    if (state === "skipped") return "Not needed: the critic found no factual errors.";
    if (state === "waiting") return "Edit the draft, then approve or reject.";
    return m.todo;
}
