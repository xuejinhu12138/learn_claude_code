export const MEMORY_TYPES = [
    'user',
    'feedback',
    'project',
    'reference',
] as const;

export type MemoryType = (typeof MEMORY_TYPES)[number];

// 记忆文件的 frontmatter 元数据
export interface MemoryMetadata {
    name: string;
    description: string;
    type: MemoryType;
}

// 解析后的记忆文件
export interface MemoryFile {
    metadata: MemoryMetadata;
    content: string;
}