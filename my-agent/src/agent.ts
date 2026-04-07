import { addMessage } from "./history";
import { sendMessage } from "./api";
import { getHistory } from "./history";
import { createAssistantMessage, createToolMessage, createUserMessage, type SendMessageResult } from "./types";
import { toolRegistry } from "./tools/registry";
import { printDebug, printError } from "./utils/print";
import { MAX_TURNS } from "./constants";

// 用户问题 - AI回答 - 执行工具将结果返回给AI继续让AI回答
async function runAgent(userInput: string): Promise<void> {
    // 1. 将用户输入添加到历史记录中
    addMessage(createUserMessage(userInput));
    let isContinue = true;
    let turns = 0;
    process.stdout.write("AI> ");
    while (isContinue) {
        // 2. 调用 sendMessage 函数，传入历史记录
        const { text, stop_reason, tool_use } = await sendMessage(getHistory());
        
        // 3. 将 AI 的回复添加到历史记录中
        addMessage(createAssistantMessage(text, tool_use));

        // 4. 根据 stop_reason 和 tool_use 决定下一步操作
        switch (stop_reason) {
            case 'tool_calls':
                // 这里可以根据 tool_use 的内容调用相应的工具
                printDebug(`AI wants to use tools:${tool_use.map(({ function: { name, arguments: argsStr } }) => {
                    return `\n  - ${name} with input ${argsStr} \n`;
                }).join("")}`);
                await Promise.all(
                    tool_use.map(async ({ id, function: { name, arguments: argsStr } }) => {
                        const tool = toolRegistry.get(name);
                        try {
                            const input = JSON.parse(argsStr || "{}");
                            if (!tool) {
                                throw new Error(`Tool ${name} not found`);
                            }
                            const result = await tool.call(input);
                            addMessage(createToolMessage(id, result));
                        } catch (err) {
                            // 因为结果要回传给 LLM，LLM 需要看到错误信息来决定下一步，必须要添加到历史记录里
                            addMessage(createToolMessage(id, `Error: ${err instanceof Error ? err.message : String(err)}`));
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

export { runAgent };