import type { Command } from "./registry";
import type { AgentDeps } from "../agent";
import { estimateHistoryTokens } from "../utils/tokenEstimation";

export const costCommand: Command = {
    name: 'cost',
    description: '显示当前会话的 Token 使用情况',
    aliases: ['tokens'],
    async execute(args: string, deps?: AgentDeps): Promise<string> {
        if (!deps) {
            return '错误：无法访问 Agent';
        }

        const history = deps.getHistory();
        const messageCount = history.length;
        const tokenCount = estimateHistoryTokens(history);
        
        // 计算各类型消息数量
        const userMessages = history.filter(m => m.role === 'user').length;
        const assistantMessages = history.filter(m => m.role === 'assistant').length;
        const toolMessages = history.filter(m => m.role === 'tool').length;
        
        return `📊 Token 使用情况\n\n` +
               `消息统计：\n` +
               `  总计：${messageCount} 条\n` +
               `  用户：${userMessages} 条\n` +
               `  助手：${assistantMessages} 条\n` +
               `  工具：${toolMessages} 条\n\n` +
               `估算 Token：${tokenCount} tokens\n\n` +
               `💡 提示：使用 /compact 可以压缩历史`;
    }
};
