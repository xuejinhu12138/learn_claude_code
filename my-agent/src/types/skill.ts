export enum SkillSource {
    BUNDLED = 'bundled',  // 内置技能
    DISK = 'disk',         // 本地技能
    MCP = 'mcp',           // 远程技能
  }

interface Skill {
    // 技能唯一标识
    id: string;
    // 技能名称
    name: string;
    // 技能内容
    content: string;
    // 技能来源
    source: SkillSource;

    // 技能触发词
    triggers?: string[];
    // 技能描述
    description?: string;
    // 技能文件路径
    filePath?: string;
}

interface SkillMetadata {
    name: string;
    triggers?: string[];
    description?: string;
}

interface SkillLoadOptions{
    loadBundled?: boolean;
    loadDisk?: boolean;
    loadMcp?: boolean;

    diskPath?: string;
}

export type { Skill, SkillMetadata, SkillLoadOptions };