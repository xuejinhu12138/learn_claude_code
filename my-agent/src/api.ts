import OpenAI from "openai"
import { getState } from "./bootstrap/state"
import { API_BASE_URL, DEFAULT_BASE_URL, MAX_TOKENS, MODEL } from "./constants"
import type { Message } from "./types"
import type { ChatCompletionContentPart, ChatCompletionMessageParam } from "openai/resources/chat/completions/completions.js"
import { optionalEnv } from "./utils/env"

function getClient(): OpenAI {
    const client = new OpenAI({
        apiKey: getState().apiKey,
        baseURL: optionalEnv(API_BASE_URL) ?? DEFAULT_BASE_URL,
    })
    return client;
}


async function sendMessage(messages: Message[]): Promise<string> {

    const convertMsg = messages as ChatCompletionMessageParam[];
    const client = getClient();
    const response = await client.chat.completions.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: convertMsg
    })

    const text = response.choices[0]?.message.content ?? "";
    if (!text || text.trim() === "") {
        throw new Error("Received empty response from the model");
    }
    return text;
}

export { sendMessage };