import type { SkillMetadata } from "../types/skill";
import { load } from "js-yaml";
import { readFileSync } from "fs";

interface ParseSkill {
    metadata: SkillMetadata;
    content: string;
}

function parseFrontmatter(raw: string): ParseSkill {
    // 1.读取文件
    // 2.检查是否以---开头
    // 3.找到第二个---
    // 4.提取中间的作为yaml 用yaml.load()解析

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
        const metadata = load(frontmatter) as SkillMetadata;
        return { metadata, content };
    }catch (error) {
        throw new Error(`Failed to parse frontmatter: ${error}`);
    }

}

export { parseFrontmatter, type ParseSkill };