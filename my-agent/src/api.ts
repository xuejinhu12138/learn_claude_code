import OpenAI from "openai"
import { getState } from "./bootstrap/state"
import { API_BASE_URL, DEFAULT_BASE_URL, MAX_TOKENS, MODEL, SYSTEM_PROMPT } from "./constants"
import type { Message, SendMessageResult } from "./types"
import type { ChatCompletionContentPart, ChatCompletionMessageParam } from "openai/resources/chat/completions/completions.js"
import { optionalEnv } from "./utils/env"

function getClient(): OpenAI {
    const client = new OpenAI({
        apiKey: getState().apiKey,
        baseURL: optionalEnv(API_BASE_URL) ?? DEFAULT_BASE_URL,
    })
    return client;
}


async function sendMessage(messages: Message[]): Promise<SendMessageResult> {

    const systemMessage: Message = {
        role: "system",
        content: [{
            type: "text",
            text: SYSTEM_PROMPT
        }]
    }
    const copyMessage = [
        systemMessage,
        ...messages]
    const convertMsg = copyMessage as ChatCompletionMessageParam[];
    const client = getClient();
    let text = "";
    // stream输出，流式输出到控制台，完整的结果返回后放到history里
    try {
        const stream = await client.chat.completions.create({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            messages: convertMsg,
            stream: true,
        })
        let finishReason = null;
        for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content ?? "";
            finishReason = chunk.choices[0]?.finish_reason;
            text += token;
            process.stdout.write(token);
        }
        process.stdout.write("\n");
        return {
            text,
            stop_reason: finishReason ?? 'error'
        };
        // text = response.choices[0]?.message.content ?? "";
        // if (!text || text.trim() === "") {
        //     throw new Error("Received empty response from the model");
        // }
    } catch (err) {
        return {
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            stop_reason: 'error'
        }
    }
    
}

export { sendMessage };