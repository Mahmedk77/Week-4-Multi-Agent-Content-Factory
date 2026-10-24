import { BaseMessageLike } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import z from "zod";

export type Provider = "openai";

const ATTEMPTS: Provider[] = ["openai", "openai"];

function makeModel(provider: Provider) {
    return new ChatOpenAI({ model: process.env.OPENAI_MODEL ?? "gpt-4o-mini", temperature: 0})
}

export async function invokeStructured<S extends z.ZodObject>(
    schema: S,
    messages: BaseMessageLike[],
    name: string
): Promise<{ data: z.infer<S>; provider: Provider}> {
    
    let lastError: unknown;
    for (const provider of ATTEMPTS) {
        try {
            const model = makeModel(provider).withStructuredOutput(schema, { name });
            const data = (await model.invoke(messages)) as z.infer<S> //honest assertion
            console.log(`[${name} ok via ${provider}]`);
            return { data, provider };

        } catch (err) {
            lastError = err;
            console.warn(`[${name}] ${provider} failed: ${(err as Error).message.slice(0,100)}`);
        }
    }
    throw new Error(`${name}: all providers failed`, { cause: lastError});
}