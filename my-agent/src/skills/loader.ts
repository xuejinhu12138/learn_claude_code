import type { Skill, SkillLoadOptions } from "../types/skill";
import { parseFrontmatter } from "./parser";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { basename } from "path";
import { statSync } from "fs";
import { SkillSource } from "../types/skill";
import type { Command } from "../commands/registry";
import { debuggingSkill } from './bundled/debugging';
import { extname } from "path";


function loadDiskSkills(dirPath: string): Command[] {
  if (!existsSync(dirPath)) {
    return [];
  }
  const entries = readdirSync(dirPath);
  const commands: Command[] = [];
  for (const entry of entries) {
      const skillDirPath = join(dirPath, entry);
      
      // 只处理目录
      if (!statSync(skillDirPath).isDirectory()) {
          continue;
      }
      const skillFilePath = join(skillDirPath, 'SKILL.md');
      
      // 检查 SKILL.md 是否存在
      if (!existsSync(skillFilePath)) {
          console.warn(`[skills] Skipping ${entry}: SKILL.md not found`);
          continue;
      }
      try {
          const { metadata, content: markdownContent } = parseFrontmatter(skillFilePath);
          
          // 技能名称 = 目录名
          const skillName = entry;
          
          // 创建 Command 对象
          const command: Command = {
              name: skillName,
              type: 'prompt',
              description: metadata.description || `自定义技能：${skillName}`,
              aliases: metadata.triggers,
              whenToUse: metadata.description,
              argumentHint: '<可选参数>',
              
              // 动态生成 getPromptForCommand
              async getPromptForCommand(args: string): Promise<string> {
                  // 1. 添加基础目录信息（让 AI 知道技能目录位置）
                  let finalContent = `Base directory for this skill: ${skillDirPath}\n\n${markdownContent}`;
                  
                  // 2. 参数替换
                  if (args) {
                      finalContent = `用户参数：${args}\n\n${finalContent}`;
                  }
                  
                  // 3. 变量替换：${SKILL_DIR} → 技能目录路径
                  finalContent = finalContent.replace(
                      /\$\{SKILL_DIR\}/g,
                      skillDirPath
                  );
                  
                  // 4. 变量替换：${SESSION_ID} → 会话 ID
                  finalContent = finalContent.replace(
                      /\$\{SESSION_ID\}/g,
                      Date.now().toString()
                  );
                  
                  return finalContent;
              }
          };
          
          commands.push(command);
          
      } catch (error) {
          console.error(`[skills] Failed to load ${entry}:`, error);
      }
  }
  return commands;
}

function loadBundledSkills(): Command[] {
    return [
      debuggingSkill,
    ];
}


function loadSkills(options: SkillLoadOptions = {}): Command[] {
    let commands: Command[] = [];
    
    // 加载 bundled 技能
    if (options.loadBundled !== false) {  // 默认 true
      commands = [...commands, ...loadBundledSkills()];
    }
  
    // 加载 disk 技能
    if (options.loadDisk) {
      const diskPath = options.diskPath || join(process.cwd(), 'skills');
      commands = [...commands, ...loadDiskSkills(diskPath)];
    }

    // commands = [...commands, ...loadBundledSkills()];
  
    // TODO: 加载 MCP 技能（P7-5e 实现）

    return commands;
  }


export { loadSkills };