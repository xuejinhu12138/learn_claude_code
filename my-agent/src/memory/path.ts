import { homedir } from 'os';
import { join } from 'path';

/**
 * 获取记忆目录路径
 * ~/.claude/projects/<project-name>/memory/
 */
export function getMemoryDir(): string {
    const homeDir = homedir();
    const projectName = sanitizeProjectName(process.cwd());
    return join(homeDir, '.claude', 'projects', projectName, 'memory');
}

/**
 * 清理项目名（去掉非法字符）
 */
function sanitizeProjectName(path: string): string {
    return path.replace(/[^a-zA-Z0-9-_]/g, '-');
}

/**
 * 获取 MEMORY.md 入口文件路径
 */
export function getMemoryEntrypoint(): string {
    return join(getMemoryDir(), 'MEMORY.md');
}