import type { Command } from "./registry";
import type { AgentDeps } from "../agent";
import { COMPACT_TAIL_SIZE, MAX_TOOL_RESULT_CHARS } from "../constants";
import { microCompactMessages } from "../utils/microCompactMessages";
import { appStore } from "../ui/store";

export const compactCommand: Command = {
    name: 'compact',
    description: '手动压缩对话历史',
    async execute(args: string, deps?: AgentDeps): Promise<string> {
        if (!deps) {
            return '错误：无法访问 Agent';
        }

        appStore.set(prev => ({ ...prev, currentStatus: "正在压缩对话历史..." }));

        const history = deps.getHistory();
        const beforeCount = history.length;
        
        if (beforeCount <= COMPACT_TAIL_SIZE + 2) {
            appStore.set(prev => ({ ...prev, currentStatus: undefined}));
            return `对话历史太短，无需压缩（当前 ${beforeCount} 条消息）`;
        }
        
        try {
            let history = deps.getHistory();
            history = await deps.autoCompact.check(history, deps.sendMessage.bind(deps));
            // 压缩工具的返回结果
            history = microCompactMessages(history, MAX_TOOL_RESULT_CHARS);
            deps.replaceHistory(history);
            const afterCount = history.length;
            
            // 直接让用户UI清空
            appStore.set(prev => ({ ...prev, messages: [], currentStatus: undefined}));
            return `✅ 压缩完成！\n\n` +
                   `压缩前：${beforeCount} 条消息\n` +
                   `压缩后：${afterCount} 条消息\n` +
                   `减少了 ${beforeCount - afterCount} 条消息`;
        } catch (error) {
            appStore.set(prev => ({ ...prev, currentStatus: undefined}));
            return `❌ 压缩失败：${error instanceof Error ? error.message : String(error)}`;
        }
    }
};
