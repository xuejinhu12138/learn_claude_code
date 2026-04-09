import OpenAI from "openai"
import { getState } from "./bootstrap/state"
import { API_BASE_URL, DEFAULT_BASE_URL, MAX_TOKENS, MODEL } from "./constants"
import { createSystemMessage, type Message, type SendMessageResult } from "./types"
import type { ChatCompletionContentPart, ChatCompletionMessageParam } from "openai/resources/chat/completions/completions.js"
import { optionalEnv } from "./utils/env"
import type { ToolCall } from "./types";
import { toolRegistry } from "./tools/registry"
import { buildSystemPrompt } from "./utils/buildSystemPrompt"
import { loadProjectInstructions } from "./utils/loadProjectInstructions"

function getClient(): OpenAI {
    const client = new OpenAI({
        apiKey: getState().apiKey,
        baseURL: optionalEnv(API_BASE_URL) ?? DEFAULT_BASE_URL,
    })
    return client;
}

/**
 * 流式响应的回调函数类型
 */
export type StreamCallback = (token: string, fullText: string) => void;

/**
 * 发送消息到 LLM
 * @param messages 消息历史
 * @param onToken 可选的流式回调函数，每次收到新 token 时调用
 */
async function sendMessage(
    messages: Message[], 
    onToken?: StreamCallback
): Promise<SendMessageResult> {

    // 每次调用时动态构建系统提示词
    const projectInstructions = loadProjectInstructions();
    const systemPrompt = buildSystemPrompt({
        cwd: process.cwd(),
        datetime: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
        tools: toolRegistry.list(),
        projectInstructions: projectInstructions || undefined
    });
    
    // 临时添加 system 消息（不存到历史）
    const messagesWithSystem = [
        createSystemMessage(systemPrompt),
        ...messages
    ];

    const copyMessage = structuredClone(messagesWithSystem);
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
            tools: toolRegistry.toDefinitions()
        })
        let finishReason = null;
        // 流式输出里，finish_reason是最后一个chunk里才有，tool_calls也是在delta里逐步输出的，所以要等流结束了才能拿到完整的tool_calls
        
        const toolCallMap = new Map<number, {id: string; name: string; arguments: string}>();
        for await (const chunk of stream) {
            // 一旦链上某个环节可能是 undefined，后续所有访问都要用 ?.
            const token = chunk.choices[0]?.delta?.content ?? "";
            finishReason = chunk.choices[0]?.finish_reason;
            
            // tool_calls也可能分多次输出，所以每次有新的tool_calls时都更新之前的记录，等流结束了才能拿到完整的tool_calls
            chunk.choices[0]?.delta?.tool_calls?.map((toolCall) => {
                const index = toolCall.index;
                const existing_data = toolCallMap.get(index) || { id: "", name: "", arguments: "" };

                toolCallMap.set(index, {
                    id: existing_data.id || toolCall.id || "",
                    name: existing_data.name || toolCall.function?.name || "",
                    arguments: existing_data.arguments + (toolCall.function?.arguments ?? "")
                })
            });

            text += token;
            
            // 通过回调通知外部，不直接依赖 appStore
            if (onToken) {
                onToken(token, text);
            }
        }
        
        return {
            text,
            stop_reason: finishReason ?? 'error',
            tool_use: [...toolCallMap.values()].map(({id, name, arguments: ag}) => ({
                type: "function" as const,
                id,
                function: {
                    name,
                    arguments: ag
                }
            }))
        };
    } catch (err) {
        return {
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            stop_reason: 'error',
            tool_use: []
        }
    }
    
}

export { sendMessage };