import type { Command } from "./registry";
import { loadProjectInstructions } from "../utils/loadProjectInstructions";
import { existsSync } from "fs";
import { join } from "path";

export const reloadCommand: Command = {
    name: 'reload',
    type: 'action',
    description: '重新加载 CLAUDE.md 项目指令',
    async execute(args: string): Promise<string> {
        const filePath = join(process.cwd(), 'CLAUDE.md');
        
        if (!existsSync(filePath)) {
            return '❌ 未找到 CLAUDE.md 文件';
        }
        
        // 尝试读取文件（验证格式）
        const content = loadProjectInstructions();
        
        if (!content) {
            return '❌ CLAUDE.md 读取失败';
        }
        
        const lines = content.split('\n').length;
        const chars = content.length;
        
        return `✅ CLAUDE.md 已重新加载\n\n` +
               `文件路径：${filePath}\n` +
               `内容大小：${chars} 字符，${lines} 行\n\n` +
               `💡 提示：新的指令将在下次对话时生效`;
    }
};
