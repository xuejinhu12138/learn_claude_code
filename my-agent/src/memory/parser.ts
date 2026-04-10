import { readFileSync } from 'fs';
import type { MemoryFile, MemoryMetadata, MemoryType } from './types';
import { load } from 'js-yaml';

/**
 * 解析带 frontmatter 的 Markdown 文件
 */
export function parseMemoryFile(raw: string): MemoryFile {
    // 1. 读取文件
    // 2. 提取 YAML frontmatter
    // 3. 验证 type 字段是否为有效的 MemoryType
    // 4. 返回 { metadata, content }

    const file = readFileSync(raw, "utf-8");
    if (!file.startsWith("---")) {
        throw new Error("File does not start with ---");
    }
    const end = file.indexOf("---", 3);
    if (end === -1) {
        throw new Error("File does not contain a second ---");
    }
    const frontmatter = file.slice(3, end);
    const content = file.slice(end + 4).trimStart();
    try {
        const metadata = load(frontmatter) as MemoryMetadata;
        return { metadata: metadata as MemoryMetadata, content: content };
    }catch (error) {
        throw new Error(`Failed to parse frontmatter: ${error}`);
    }
   
}