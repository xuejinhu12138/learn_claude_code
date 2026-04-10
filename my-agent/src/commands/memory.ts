import type { Command } from './registry';
import { loadMemoryIndex } from '../memory/loader';
import { getMemoryEntrypoint } from '../memory/path';

export const memoryCommand: Command = {
    name: 'memory',
    type: 'action',
    description: '查看项目记忆',
    aliases: ['mem'],
    
    async execute(): Promise<string> {
        const content = loadMemoryIndex();
        
        if (!content) {
            return `没有找到记忆文件。\n\n` +
                   `你可以手动创建 ${getMemoryEntrypoint()} 来添加项目记忆。`;
        }
        
        return `项目记忆 (MEMORY.md):\n\n${content}`;
    }
};