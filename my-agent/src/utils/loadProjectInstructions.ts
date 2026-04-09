import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * 读取项目根目录的 CLAUDE.md 文件
 * @param cwd 当前工作目录
 * @returns 文件内容，如果不存在返回 null
 */
export function loadProjectInstructions(cwd: string = process.cwd()): string | null {
    const filePath = join(cwd, 'CLAUDE.md');
    
    if (!existsSync(filePath)) {
        return null;
    }
    
    try {
        const content = readFileSync(filePath, 'utf-8');
        return content.trim();
    } catch (error) {
        console.error(`读取 CLAUDE.md 失败: ${error}`);
        return null;
    }
}
