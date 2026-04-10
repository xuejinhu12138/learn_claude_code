import type { Command } from './registry';
import type { AgentDeps } from '../agent';
import { sessionStorage } from '../session/storage';

export const loadCommand: Command = {
    name: 'load',
    type: 'action',
    description: '加载历史会话',
    aliases: ['resume'],
    argumentHint: '<session-id>',
    
    async execute(args: string, deps?: AgentDeps): Promise<string> {
        const sessionId = args.trim();
        
        if (!sessionId) {
            // 列出所有可用会话
            const sessions = sessionStorage.listSessions();
            if (sessions.length === 0) {
                return '没有可用的历史会话';
            }
            return `可用会话：\n${sessions.map(id => `  - ${id}`).join('\n')}`;
        }
        
        // 加载指定会话
        const entries = sessionStorage.loadTranscript(sessionId);
        if (entries.length === 0) {
            return `会话 ${sessionId} 不存在或为空`;
        }

        if (deps) {
            deps.loadSession(sessionId);
        }
        
        return `准备加载会话 ${sessionId}（${entries.length} 条记录）`;
    }
};