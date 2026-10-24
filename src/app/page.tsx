import { Suspense } from "react";
import { RunFlow } from "@/components/run/RunFlow";

// RunFlow reads ?run=<id> with useSearchParams, which needs a Suspense boundary (Next 16 docs).
export default function Home() {
    return (
        <Suspense fallback={null}>
            <RunFlow />
        </Suspense>
    );
}
