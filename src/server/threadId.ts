import "server-only";
import z from "zod";

const Uuid = z.uuid();

// Route params are user input: only accept UUIDs (thread ids and post ids).
export async function readUuidParam(params: Promise<{ id: string }>): Promise<string | null> {
    const { id } = await params;
    const parsed = Uuid.safeParse(id);
    return parsed.success ? parsed.data : null;
}
