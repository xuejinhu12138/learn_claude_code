import type { Command } from './registry';
import { commandRegistry } from './registry';

export const helpCommand: Command = {
    name: 'help',
    description: '显示所有可用命令',
    type: 'action',
    aliases: ['h', '?'],
    async execute(args: string): Promise<string> {
        const commands = commandRegistry.list();
        const actionCommands = commands.filter(cmd => cmd.type === 'action');
        const skillCommands = commands.filter(cmd => cmd.type === 'prompt');
        
        let result = '## 📋 可用命令\n\n';
        
        // 显示传统命令
        if (actionCommands.length > 0) {
            result += '### 系统命令\n\n';
            for (const cmd of actionCommands) {
                result += `/${cmd.name}`;
                if (cmd.aliases) {
                    result += ` (${cmd.aliases.map(a => `/${a}`).join(', ')})`;
                }
                result += `\n  ${cmd.description}\n\n`;
            }
        }
        
        // 显示技能命令
        if (skillCommands.length > 0) {
            result += '### 💡 技能命令\n\n';
            for (const cmd of skillCommands) {
                result += `/${cmd.name}`;
                if (cmd.aliases) {
                    result += ` (${cmd.aliases.map(a => `/${a}`).join(', ')})`;
                }
                result += `\n  ${cmd.description}`;
                if (cmd.whenToUse) {
                    result += `\n  使用场景：${cmd.whenToUse}`;
                }
                result += '\n\n';
            }
        }
        
        return result;
    }
};
