import { addMessage, clearHistory } from "./history";
import { sendMessage } from "./api";
import { getHistory } from "./history";
import { createAssistantMessage, createSystemMessage, createToolMessage, createUserMessage, type Message, type SendMessageResult, type ToolCall } from "./types";
import { toolRegistry } from "./tools/registry";
import { printDebug, printError } from "./utils/print";
import { COMPACT_TAIL_SIZE, COMPACT_THRESHOLD, COMPACT_TOKEN_THRESHOLD, COMPACT_WARNING_THRESHOLD, COMPACT_WARNING_TOKEN_THRESHOLD, MAX_TOOL_RESULT_CHARS, MAX_TURNS } from "./constants";
import type { Tool } from "./types/tool";
import { buildSystemPrompt, type SystemPromptContext } from "./utils/buildSystemPrompt";
import { createAutoCompact } from "./utils/autoCompact";
import { createCompactWarning } from "./utils/compactWarning";
import { microCompactMessages } from "./utils/microCompactMessages";
import { appStore } from "./ui/store"
import type { SessionEntry } from "./types/session";
import { sessionStorage } from "./session/storage";
import { uuid } from "zod";

class AgentDeps {
    // deps 只需要包含"有副作用或有外部依赖"的东西（history 操作、API 调用、工具查找）
    private conversation: Message[] = [];
    private sessionId: string;

    constructor(sessionId?: string) {
        if (sessionId) {
            // 恢复现有会话
            this.sessionId = sessionId;
            const entries = sessionStorage.loadTranscript(sessionId);
            this.conversation = this.entriesToMessages(entries);
            console.log(`[Agent] 恢复会话 ${sessionId}，加载了 ${this.conversation.length} 条消息`);
        } else {
            // 创建新会话
            this.sessionId = this.generateUuid();
            sessionStorage.createSession(this.sessionId);
            console.log(`[Agent] 创建新会话 ${this.sessionId}`);
        }
    }

    loadSession(sessionId: string): void {
        this.sessionId = sessionId;
        this.conversation = this.entriesToMessages(sessionStorage.loadTranscript(sessionId));
        console.log(`[Agent] 恢复会话 ${sessionId}，加载了 ${this.conversation.length} 条消息`);
    }

    // 辅助方法：生成 UUID
    private generateUuid(): string {
        return crypto.randomUUID();
    }

    private messageToEntry(message: Message): SessionEntry[] {
        const entries: SessionEntry[] = [];
        const timestamp = new Date().toISOString();
        
        switch (message.role) {
            case 'user':
                // User 消息：只有一个文本内容
                entries.push({
                    type: 'user',
                    content: message.content.map(c => c.text).join('\n'),
                    uuid: this.generateUuid(),
                    timestamp,
                });
                break;
                
            case 'assistant':
                // Assistant 消息：可能有文本 + 工具调用
                
                // 1. 如果有文本内容，生成 AssistantEntry
                const textContent = message.content.map(c => c.text).join('\n').trim();
                if (textContent) {
                    entries.push({
                        type: 'assistant',
                        content: textContent,
                        uuid: this.generateUuid(),
                        timestamp,
                    });
                }
                
                // 2. 如果有工具调用，每个生成一个 ToolUseEntry
                if (message.tool_calls) {
                    for (const toolCall of message.tool_calls) {
                        entries.push({
                            type: 'tool_use',
                            tool: toolCall.function.name,
                            input: JSON.parse(toolCall.function.arguments),
                            tool_use_id: toolCall.id,
                            uuid: this.generateUuid(),
                            timestamp,
                        });
                    }
                }
                break;
                
            case 'tool':
                // Tool 消息：工具执行结果
                if (!message.tool_call_id) {
                    throw new Error('Tool message must have tool_call_id');
                }
                
                entries.push({
                    type: 'tool_result',
                    tool_use_id: message.tool_call_id,
                    output: message.content.map(c => c.text).join('\n'),
                    is_error: false,
                    uuid: this.generateUuid(),
                    timestamp,
                });
                break;
                
            case 'system':
                // System 消息通常不持久化（因为每次都动态生成）
                // 但如果需要，可以用 UserEntry 的格式存储
                entries.push({
                    type: 'user',  // 用 user 类型存储 system 消息
                    content: `[SYSTEM] ${message.content.map(c => c.text).join('\n')}`,
                    uuid: this.generateUuid(),
                    timestamp,
                });
                break;
                
            default:
                throw new Error(`Unknown message role: ${message.role}`);
        }
        
        return entries;
    }

    private entriesToMessages(entries: SessionEntry[]): Message[] {
        const messages: Message[] = [];
        let pendingAssistantText: string | undefined;
        let pendingToolCalls: ToolCall[] = [];
        
        for (const entry of entries) {
            switch (entry.type) {
                case 'user':
                    // 如果有待处理的 assistant 消息，先推入
                    if (pendingAssistantText || pendingToolCalls.length > 0) {
                        messages.push(createAssistantMessage(
                            pendingAssistantText || '',
                            pendingToolCalls.length > 0 ? pendingToolCalls : undefined
                        ));
                        pendingAssistantText = undefined;
                        pendingToolCalls = [];
                    }
                    
                    // 推入 user 消息
                    messages.push(createUserMessage(entry.content));
                    break;
                    
                case 'assistant':
                    // 暂存 assistant 文本（可能后面还有 tool_use）
                    pendingAssistantText = entry.content;
                    break;
                    
                case 'tool_use':
                    // 收集工具调用
                    pendingToolCalls.push({
                        id: entry.tool_use_id,
                        type: 'function',
                        function: {
                            name: entry.tool,
                            arguments: JSON.stringify(entry.input)
                        }
                    });
                    break;
                    
                case 'tool_result':
                    // 如果有待处理的 assistant，先推入
                    if (pendingAssistantText !== undefined || pendingToolCalls.length > 0) {
                        messages.push(createAssistantMessage(
                            pendingAssistantText || '',
                            pendingToolCalls.length > 0 ? pendingToolCalls : undefined
                        ));
                        pendingAssistantText = undefined;
                        pendingToolCalls = [];
                    }
                    
                    // 推入 tool 结果
                    messages.push(createToolMessage(entry.tool_use_id, entry.output));
                    break;
            }
        }
        
        // 处理最后的待处理消息
        if (pendingAssistantText !== undefined || pendingToolCalls.length > 0) {
            messages.push(createAssistantMessage(
                pendingAssistantText || '',
                pendingToolCalls.length > 0 ? pendingToolCalls : undefined
            ));
        }
        
        return messages;
    }
    

    private persistMessage(message: Message): void {
        // 将 Message 转换为 SessionEntry 数组
        const entries: SessionEntry[] = this.messageToEntry(message);
        
        // 追加所有 Entry 到 JSONL
        for (const entry of entries) {
            sessionStorage.appendEntry(this.sessionId, entry);
        }
    }
    
    addMessage(message: Message): void {
        this.conversation.push(message);

        // 持久化到文件
        this.persistMessage(message);
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
        // 传入回调函数，更新 UI
        return sendMessage(messages, (token, fullText) => {
            appStore.set(prev => ({ ...prev, streamingText: fullText }));
        });
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
    appStore.set(prev => ({ ...prev, currentStatus: "正在思考..." }));

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
                        appStore.set(prev => ({ ...prev, currentStatus: `正在执行: ${name}` }));
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
    appStore.set(prev => ({ ...prev, currentStatus: undefined }));
    
    new Promise(resolve => resolve("Agent run completed"));
}

export { runAgent, createDefaultDeps };
export type { AgentDeps };