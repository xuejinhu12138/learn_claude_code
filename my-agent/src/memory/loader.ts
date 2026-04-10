import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { getMemoryDir, getMemoryEntrypoint } from './path';
import { parseMemoryFile } from './parser';
import type { MemoryFile } from './types';
import { readFileSync } from 'fs';


/**
 * 加载 MEMORY.md 入口文件
 * 如果不存在，返回 null
 */
export function loadMemoryIndex(): string | null {
    const entrypointPath = getMemoryEntrypoint();
    if (!existsSync(entrypointPath)) {
        return null;
    }
    
    const content = readFileSync(entrypointPath, 'utf-8');
    
    // 限制大小（Claude Code 限制 200 行或 25KB）
    const lines = content.split('\n');
    if (lines.length > 200) {
        return lines.slice(0, 200).join('\n') + 
               '\n\n> WARNING: MEMORY.md 超过 200 行，仅加载前 200 行';
    }
    
    return content;
}

/**
 * 加载所有记忆文件
 */
export function loadAllMemories(): MemoryFile[] {
    const memoryDir = getMemoryDir();
    if (!existsSync(memoryDir)) {
        return [];
    }
    
    const files = readdirSync(memoryDir).filter(f => 
        f.endsWith('.md') && f !== 'MEMORY.md'
    );
    
    return files.map(file => 
        parseMemoryFile(join(memoryDir, file))
    );
}