import { addMessage, clearHistory } from "./history";
import { sendMessage } from "./api";
import { getHistory } from "./history";
import { createAssistantMessage, createSystemMessage, createToolMessage, createUserMessage, type Message, type SendMessageResult } from "./types";
import { toolRegistry } from "./tools/registry";
import { printDebug, printError } from "./utils/print";
import { COMPACT_TAIL_SIZE, COMPACT_THRESHOLD, COMPACT_TOKEN_THRESHOLD, COMPACT_WARNING_THRESHOLD, COMPACT_WARNING_TOKEN_THRESHOLD, MAX_TOOL_RESULT_CHARS, MAX_TURNS } from "./constants";
import type { Tool } from "./types/tool";
import { buildSystemPrompt, type SystemPromptContext } from "./utils/buildSystemPrompt";
import { createAutoCompact } from "./utils/autoCompact";
import { createCompactWarning } from "./utils/compactWarning";
import { microCompactMessages } from "./utils/microCompactMessages";

class AgentDeps {
    // deps 只需要包含"有副作用或有外部依赖"的东西（history 操作、API 调用、工具查找）
    private conversation: Message[] = [];

    addMessage(message: Message): void {
        this.conversation.push(message);
    }

    getHistory(): Message[] {
        const copyHistory = [...this.conversation]; // 返回历史记录的副本，防止外部修改原始数据
        return copyHistory;
    }

    clearHistory(): void {
        this.conversation = [];
    }

    getLastMessage(): Message | undefined {
        if (this.conversation.length === 0) return undefined;
        return this.conversation[this.conversation.length - 1];
    }

    // 工具目前全局唯一，如果未来有多个工具集或需要动态注册工具，可以在 AgentDeps 里维护一个工具列表
    getTool(name: string): Tool | undefined {
        return toolRegistry.get(name);
    }

    sendMessage(messages: Message[]): Promise<SendMessageResult> {
        return sendMessage(messages);
    }

    // 上下文压缩相关
    autoCompact = createAutoCompact(COMPACT_TOKEN_THRESHOLD, COMPACT_TAIL_SIZE);
    compactWarning = createCompactWarning(COMPACT_WARNING_TOKEN_THRESHOLD, printError);

    replaceHistory(messages: Message[]): void {
        this.conversation = messages;
    }
}

function createDefaultDeps(): AgentDeps {
    return new AgentDeps();
}



// 用户问题 - AI回答 - 执行工具将结果返回给AI继续让AI回答
async function runAgent(userInput: string, deps: AgentDeps = createDefaultDeps()): Promise<void> {
    // 1. 将用户输入添加到历史记录中
    deps.addMessage(createUserMessage(userInput));
    let isContinue = true;
    let turns = 0;
    while (isContinue) {
        // 2. 检查是否需要上下文压缩，调用 sendMessage 函数，传入历史记录
        let history = deps.getHistory();
        // 到达消息条数告警线时，提醒用户当前对话上下文过长，可能需要清理历史或开启新对话
        deps.compactWarning.check(history);
        // 到达压缩线时，进行上下文压缩 [system 消息（如有）] + [摘要 user 消息] + [占位 assistant 消息] + [尾部 tailSize 轮次消息]
        // 轮次消息保证 tool 调用和 assistant 回复成对出现，不会只保留 tool 消息导致上下文不连贯
        history = await deps.autoCompact.check(history, deps.sendMessage.bind(deps));
        // 压缩工具的返回结果
        history = microCompactMessages(history, MAX_TOOL_RESULT_CHARS);
        deps.replaceHistory(history);

        const { text, stop_reason, tool_use } = await deps.sendMessage(history);
        
        // 3. 将 AI 的回复添加到历史记录中
        deps.addMessage(createAssistantMessage(text, tool_use));

        // 4. 根据 stop_reason 和 tool_use 决定下一步操作
        switch (stop_reason) {
            case 'tool_calls':
                // 这里可以根据 tool_use 的内容调用相应的工具
                printDebug(`AI wants to use tools:${tool_use.map(({ function: { name, arguments: argsStr } }) => {
                    return `\n  - ${name} with input ${argsStr} \n`;
                }).join("")}`);
                await Promise.all(
                    tool_use.map(async ({ id, function: { name, arguments: argsStr } }) => {
                        const tool = deps.getTool(name);
                        try {
                            const input = JSON.parse(argsStr || "{}");
                            if (!tool) {
                                throw new Error(`Tool ${name} not found`);
                            }
                            const result = await tool.call(input);
                            deps.addMessage(createToolMessage(id, result));
                        } catch (err) {
                            // 因为结果要回传给 LLM，LLM 需要看到错误信息来决定下一步，必须要添加到历史记录里
                            deps.addMessage(createToolMessage(id, `Error: ${err instanceof Error ? err.message : String(err)}`));
                        }

                    })
                );

                // 如果 AI 想要调用工具，增加连续调用轮数，超过限制则结束对话
                turns++;
                if (turns > MAX_TURNS){
                    printError(`已达到工具最大连续交互轮数 ${MAX_TURNS}，结束对话。`);
                    isContinue = false;
                }
                break;
            case 'error':
                printError(`发生错误，结束对话。`);
                isContinue = false;
                break;
            case 'stop':
            case 'length':
            case 'end_turn':
            default:
                isContinue = false;
                break;
        }
    }
    // 表示完成
    new Promise(resolve => resolve("Agent run completed"));
}

export { runAgent, createDefaultDeps };
export type { AgentDeps };