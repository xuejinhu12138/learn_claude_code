import type { Command } from "./registry";
import { appStore } from "../ui/store";
import { commandRegistry } from "./registry";
import type { AgentDeps } from "../agent";

export const clearCommand: Command = {
    name: 'clear',
    description: '清空对话历史',
    async execute(args: string, deps?: AgentDeps): Promise<string> {
        // 清空 UI 消息
        appStore.set(prev => ({ ...prev, messages: [] }));
        
        // 清空 Agent 历史
        if (deps) {
            deps.clearHistory();
        }
        
        return '对话历史已清空';
    }
};
