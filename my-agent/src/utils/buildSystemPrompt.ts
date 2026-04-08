type SystemPromptContext = {
    cwd: string           // 当前工作目录
    datetime: string      // 当前时间（字符串）
    tools: { name: string; description: string }[]  // 工具列表
    memory?: string       // 可选：项目记忆内容
}

// 角色定义："你是一个 AI 编程助手，帮助用户完成编程任务。"
// 工作目录："当前工作目录：{cwd}"
// 当前时间："当前时间：{datetime}"
// 工具列表：每个工具一行 "- {name}: {description}"
// 如果有 memory，追加："项目记忆：\n{memory}"
function buildSystemPrompt(context: SystemPromptContext): string {
    const { cwd, datetime, tools, memory } = context;
    let prompt = `你是一个 AI 编程助手，帮助用户完成编程任务。\n`;
    prompt += `当前工作目录：${cwd}\n`;
    prompt += `当前时间：${datetime}\n`;
    prompt += `你可以使用以下工具：\n`;
    tools.forEach(tool => {
        prompt += `- ${tool.name}: ${tool.description}\n`;
    });
    if (memory) {
        prompt += `项目记忆：\n${memory}\n`;
    }
    return prompt;
}

export { buildSystemPrompt, type SystemPromptContext };