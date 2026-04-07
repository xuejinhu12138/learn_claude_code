import { addMessage } from "./history";
import { sendMessage } from "./api";
import { getHistory } from "./history";
import { createAssistantMessage, createToolMessage, createUserMessage, type SendMessageResult } from "./types";
import { toolRegistry } from "./tools/registry";
import { tr } from "zod/locales";
import { resolve } from "bun";
import { printDebug } from "./utils/print";

// 用户问题 - AI回答 - 执行工具将结果返回给AI继续让AI回答
async function runAgent(userInput: string): Promise<void> {
    // 1. 将用户输入添加到历史记录中
    addMessage(createUserMessage(userInput));
    let isContinue = true;
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
                for (const { id, function: { name, arguments: argsStr } } of tool_use) {
                    const tool = toolRegistry.get(name);
                    if (tool) {
                        const input = JSON.parse(argsStr || "{}");
                        await tool.call(input).then(text => {
                            // 5. 可以将工具的结果添加到历史记录中
                            addMessage(createToolMessage(id, text));
                        }).catch(err => {
                            console.error(`Error calling tool ${name}:`, err);
                        });
                    }else{
                        console.error(`Tool ${name} not found in registry.`);
                    }
                };
                break;
            case 'stop':
            case 'length':
            case 'end_turn':
                isContinue = false;
                break;
        }
    }
    // 表示完成
    new Promise(resolve => resolve("Agent run completed"));
}

export { runAgent };