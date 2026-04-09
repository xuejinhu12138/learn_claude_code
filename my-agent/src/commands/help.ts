import type { Command } from './registry';
import { commandRegistry } from './registry';

export const helpCommand: Command = {
    name: 'help',
    description: '显示所有可用命令',
    aliases: ['h', '?'],
    async execute(args: string): Promise<string> {
        const commands = commandRegistry.list();
        let result = '可用命令：\n\n';
        
        for (const cmd of commands) {
            result += `/${cmd.name}`;
            if (cmd.aliases) {
                result += ` (别名: ${cmd.aliases.map(a => `/${a}`).join(', ')})`;
            }
            result += `\n  ${cmd.description}\n\n`;
        }
        
        return result;
    }
};
