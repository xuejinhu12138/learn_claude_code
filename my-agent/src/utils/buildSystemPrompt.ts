type SystemPromptContext = {
    cwd: string           // 当前工作目录
    datetime: string      // 当前时间（字符串）
    tools: { name: string; description: string }[]  // 工具列表
    memory?: string       // 可选：项目记忆内容
    projectInstructions?: string  // 可选：项目指令（CLAUDE.md）
    skills?: { name: string; description: string; whenToUse?: string; aliases?: string[] }[]  // 可选：技能列表
}

// 角色定义："你是一个 AI 编程助手，帮助用户完成编程任务。"
// 工作目录："当前工作目录：{cwd}"
// 当前时间："当前时间：{datetime}"
// 工具列表：每个工具一行 "- {name}: {description}"
// 如果有 memory，追加："项目记忆：\n{memory}"
function buildSystemPrompt(context: SystemPromptContext): string {
    const { cwd, datetime, tools, memory, projectInstructions, skills } = context;
    let prompt = `你是一个 AI 编程助手，帮助用户完成编程任务。\n\n`;
    
    // 项目指令优先（最重要）
    if (projectInstructions) {
        prompt += `## 项目指令\n\n${projectInstructions}\n\n`;
    }
    
    prompt += `## 环境信息\n\n`;
    prompt += `当前工作目录：${cwd}\n`;
    prompt += `当前时间：${datetime}\n\n`;
    
    prompt += `## 可用工具\n\n`;
    tools.forEach(tool => {
        prompt += `- ${tool.name}: ${tool.description}\n`;
    });

    if (skills && skills.length > 0) {
        prompt += `\n## 可用技能\n\n`;
        prompt += `你可以通过在回复中建议用户使用以下技能命令来获得专业指导：\n\n`;
        skills.forEach(skill => {
            prompt += `- /${skill.name}`;
            if (skill.aliases && skill.aliases.length > 0) {
                prompt += ` (别名: ${skill.aliases.map(a => `/${a}`).join(', ')})`;
            }
            prompt += `\n  描述：${skill.description}`;
            if (skill.whenToUse) {
                prompt += `\n  使用场景：${skill.whenToUse}`;
            }
            prompt += `\n\n`;
        });
    }
    
    
    if (memory) {
        prompt += `\n## 项目记忆\n\n${memory}\n`;
    }
    
    return prompt;
}

export { buildSystemPrompt, type SystemPromptContext };