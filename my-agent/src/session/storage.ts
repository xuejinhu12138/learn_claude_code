import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { SessionEntry } from '../types/session';

/**
 * 一个项目可以同时存在多个sessionId.jsonl文件
 */
export class SessionStorage {
    /**
     * 获取会话目录路径
     * ~/.claude/projects/<project-name>/
     */
    getSessionDir(): string {
        const homeDir = homedir();
        const projectName = this.sanitizeProjectName(process.cwd());
        return join(homeDir, '.claude', 'projects', projectName);
    }

    /**
     * 清理项目名（去掉非法字符）
     */
    private sanitizeProjectName(path: string): string {
        return path.replace(/[^a-zA-Z0-9-_]/g, '-');
    }
    
    /**
     * 获取会话文件路径
     */
    getTranscriptPath(sessionId: string): string {
        return join(this.getSessionDir(), `${sessionId}.jsonl`);
    }
    
    /**
     * 追加一条记录到 JSONL
     */
    appendEntry(sessionId: string, entry: SessionEntry): void {
        // 确保目录存在
        const dir = this.getSessionDir();
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        
        const path = this.getTranscriptPath(sessionId);
        const line = JSON.stringify(entry) + '\n';
        appendFileSync(path, line, 'utf-8');
    }

    /**
     * 加载会话文件
     */
    loadTranscript(sessionId: string): SessionEntry[] {
        const path = this.getTranscriptPath(sessionId);
        if (!existsSync(path)) {
            return [];
        }
        const lines = readFileSync(path, 'utf-8').split('\n').filter(line => line.trim() !== '');
        return lines.map(line => JSON.parse(line) as SessionEntry);
    }

    /**
     * 列出所有会话的sessionId
     */
    listSessions(): string[] {
        const dir = this.getSessionDir();
        if (!existsSync(dir)) {
            return [];
        }
        
        return readdirSync(dir)
            .filter(file => file.endsWith('.jsonl'))
            .map(file => file.replace('.jsonl', ''));
    }

    /**
     * 创建新会话
     */
    createSession(sessionId: string): void {
        const dir = this.getSessionDir();
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        const path = this.getTranscriptPath(sessionId);
        if (existsSync(path)) {
            throw new Error(`Session ${sessionId} already exists`);
        }
        appendFileSync(path, '', 'utf-8');
    }

}

export const sessionStorage = new SessionStorage();