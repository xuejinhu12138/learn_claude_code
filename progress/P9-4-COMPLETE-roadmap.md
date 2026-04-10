# P9-4 AgentTool 完整实现路线图

> **警告**：这是 Claude Code AgentTool 的**完整实现**，不是简化版！
> 包含所有核心特性：磁盘加载、Fork Agent、后台任务、Worktree 隔离、MCP 服务器、Agent 恢复等。

---

## 🚨 我之前的简化版遗漏了什么？

### 我之前的简化版只包含：
1. ✅ 基础 Agent 类型定义（3 个内置类型）
2. ✅ 工具白名单过滤
3. ✅ 独立的对话上下文
4. ✅ 简单的 AgentTool 调用

### Claude Code 完整版还包含：

#### 1. **Agent 定义加载系统**（类似 Skills）
- 从磁盘加载自定义 Agent（`.agents/` 目录）
- Agent frontmatter 解析（YAML 元数据）
- Agent 系统提示词文件（`AGENT.md`）
- 内置 Agent + 磁盘 Agent + 插件 Agent 的合并

#### 2. **Fork Subagent 机制**
- 共享父 Agent 的上下文（不需要重新提供背景）
- Prompt cache 复用（性能优化）
- Fork 与 Fresh Agent 的区别

#### 3. **Agent 工具解析** (`resolveAgentTools`)
- 工具继承（从父 Agent 继承工具）
- 工具白名单/黑名单合并
- MCP 工具动态加载
- 工具权限检查

#### 4. **Agent Transcript 管理**
- 子 Agent 的会话保存在独立文件（`<sessionId>/subagents/agent-<agentId>.jsonl`）
- Agent 元数据文件（`.meta.json`）
- Transcript 目录结构管理

#### 5. **后台任务执行**
- `run_in_background: true` 参数
- 后台 Agent 的通知机制
- 非阻塞执行

#### 6. **Worktree 隔离**
- `isolation: "worktree"` 参数
- 创建临时 Git worktree
- 自动清理机制

#### 7. **Agent 恢复**
- `resume: "<agentId>"` 参数
- 恢复中断的 Agent
- 保持上下文连续性

#### 8. **Agent 通知和通信**
- Agent 完成后的通知消息
- SendMessageTool（与运行中的 Agent 通信）
- Agent 之间的消息传递

#### 9. **Agent 内存共享**
- Agent 可以访问父 Agent 的内存
- 内存快照机制
- 跨 Agent 的内存传递

#### 10. **Agent MCP 服务器**
- Agent 可以定义自己的 MCP 服务器
- Agent-specific MCP 工具
- MCP 服务器生命周期管理

#### 11. **Agent 颜色和显示**
- UI 层面的 Agent 颜色分配
- Agent 状态显示（运行中/完成/失败）
- 多 Agent 并发时的视觉区分

#### 12. **Hook 系统集成**
- PreToolUse/PostToolUse hooks
- Agent 特定的 hook 配置
- Hook frontmatter 解析

---

## 📋 完整实现任务列表（共 45 个子任务）

### Phase 1: 基础类型和架构（6 个任务）

#### P9-4-1a: AgentType 完整定义
```typescript
export interface AgentType {
    name: string;                    // Agent 类型名称
    description: string;             // 简短描述
    whenToUse: string;              // 使用场景
    tools?: string[];               // 工具白名单（undefined = 所有）
    disallowedTools?: string[];     // 工具黑名单
    systemPrompt?: string;          // 系统提示词（可以是文件路径）
    mcpServers?: MCPServerConfig[]; // Agent 专用 MCP 服务器
    source: 'built-in' | 'disk' | 'plugin';  // Agent 来源
    filePath?: string;              // 定义文件路径（磁盘 Agent）
    inheritContext?: boolean;       // 是否继承父 Agent 上下文（Fork）
}
```

#### P9-4-1b: AgentDefinition vs AgentType
- `AgentType`: 静态配置（来自文件或代码）
- `AgentDefinition`: 运行时表示（包含解析后的系统提示词、工具列表等）

#### P9-4-1c: Agent 存储目录结构
```
~/.claude/
├── agents/                    # 用户自定义 Agent
│   └── my-reviewer/
│       └── AGENT.md          # Agent 定义文件
├── projects/
│   └── <project>/
│       └── <sessionId>/
│           ├── <sessionId>.jsonl           # 主 Agent transcript
│           └── subagents/
│               ├── agent-<agentId>.jsonl  # 子 Agent transcript
│               └── agent-<agentId>.meta.json  # 子 Agent 元数据
```

#### P9-4-1d: AgentToolInput 完整版
```typescript
export interface AgentToolInput {
    // 基础参数
    subagent_type?: string;        // Agent 类型
    description: string;           // 简短描述
    prompt: string;                // 任务描述
    
    // 高级参数
    run_in_background?: boolean;   // 后台运行
    isolation?: 'none' | 'worktree' | 'remote';  // 隔离模式
    resume?: string;               // 恢复 Agent ID
    model?: string;                // 使用的模型
    name?: string;                 // Agent 名称（用于 UI 显示）
    
    // Fork 相关（Claude Code 动态决定）
    // 如果 subagent_type 为空 → Fork
}
```

#### P9-4-1e: AgentToolOutput 完整版
```typescript
export interface AgentToolOutput {
    // 基础输出
    result: string;                // 最终回复
    message_count: number;         // 消息数量
    agent_type: string;            // Agent 类型
    agent_id: string;              // Agent ID
    
    // Worktree 相关
    worktree_path?: string;        // Worktree 路径（如果使用了隔离）
    worktree_branch?: string;      // Worktree 分支
    
    // 后台任务相关
    output_file?: string;          // 后台任务的输出文件路径
    is_background?: boolean;       // 是否后台运行
    
    // Fork 相关
    is_fork?: boolean;             // 是否是 Fork
}
```

#### P9-4-1f: 内置 Agent 类型（17 个）
```typescript
export const BUILT_IN_AGENT_TYPES = {
    'general-purpose': {...},      // 通用
    'explore': {...},              // 只读探索
    'shell': {...},                // Shell 专用
    'best-of-n-runner': {...},     // Worktree 实验
    'gsd-executor': {...},         // GSD 执行器
    'gsd-planner': {...},          // GSD 规划器
    'gsd-verifier': {...},         // GSD 验证器
    'gsd-debugger': {...},         // GSD 调试器
    'code-reviewer': {...},        // 代码审查
    'docs-researcher': {...},      // 文档研究
    // ... 等等
};
```

---

### Phase 2: Agent 定义加载系统（8 个任务）

#### P9-4-2a: Agent frontmatter 解析器
**文件**: `my-agent/src/agents/parser.ts`

```typescript
import { parse as parseYaml } from 'yaml';

export interface AgentFrontmatter {
    name: string;
    description: string;
    whenToUse: string;
    tools?: string[];
    disallowedTools?: string[];
    mcpServers?: string[];  // MCP 服务器名称
    inheritContext?: boolean;
}

export interface ParsedAgent {
    frontmatter: AgentFrontmatter;
    systemPrompt: string;  // AGENT.md 的内容（去掉 frontmatter）
}

export function parseAgentFile(filePath: string): ParsedAgent {
    const content = readFileSync(filePath, 'utf-8');
    
    // 提取 frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!frontmatterMatch) {
        throw new Error('Agent file must have frontmatter');
    }
    
    const frontmatter = parseYaml(frontmatterMatch[1]) as AgentFrontmatter;
    const systemPrompt = content.slice(frontmatterMatch[0].length).trim();
    
    return { frontmatter, systemPrompt };
}
```

#### P9-4-2b: 磁盘 Agent 加载器
**文件**: `my-agent/src/agents/loader.ts`

```typescript
export function loadDiskAgents(dirPath: string): AgentDefinition[] {
    if (!existsSync(dirPath)) {
        return [];
    }
    
    const entries = readdirSync(dirPath);
    const agents: AgentDefinition[] = [];
    
    for (const entry of entries) {
        const agentDirPath = join(dirPath, entry);
        
        // 只处理目录
        if (!statSync(agentDirPath).isDirectory()) {
            continue;
        }
        
        const agentFilePath = join(agentDirPath, 'AGENT.md');
        
        if (!existsSync(agentFilePath)) {
            console.warn(`[Agents] Skipping ${entry}: AGENT.md not found`);
            continue;
        }
        
        try {
            const { frontmatter, systemPrompt } = parseAgentFile(agentFilePath);
            
            agents.push({
                name: entry,
                description: frontmatter.description,
                whenToUse: frontmatter.whenToUse,
                tools: frontmatter.tools,
                disallowedTools: frontmatter.disallowedTools,
                systemPrompt,
                source: 'disk',
                filePath: agentDirPath,
                inheritContext: frontmatter.inheritContext
            });
            
        } catch (error) {
            console.error(`[Agents] Failed to load ${entry}:`, error);
        }
    }
    
    return agents;
}
```

#### P9-4-2c: 内置 Agent 定义
**文件**: `my-agent/src/agents/builtIn.ts`

```typescript
export const builtInAgents: AgentDefinition[] = [
    {
        name: 'general-purpose',
        description: 'General-purpose agent with all tools',
        whenToUse: 'Complex multi-step tasks',
        tools: [],  // 所有工具
        systemPrompt: DEFAULT_AGENT_PROMPT,
        source: 'built-in'
    },
    {
        name: 'explore',
        description: 'Read-only agent for exploring codebase',
        whenToUse: 'Search code, understand structure',
        tools: ['read_file', 'bash', 'grep', 'glob'],
        systemPrompt: `You are a read-only exploration agent.
Your job is to explore the codebase and report findings.
Do NOT modify any files.`,
        source: 'built-in'
    },
    // ... 更多内置 Agent
];
```

#### P9-4-2d: Agent 注册表
**文件**: `my-agent/src/agents/registry.ts`

```typescript
export class AgentRegistry {
    private agents: Map<string, AgentDefinition> = new Map();
    
    register(agent: AgentDefinition): void {
        this.agents.set(agent.name, agent);
    }
    
    get(name: string): AgentDefinition | undefined {
        return this.agents.get(name);
    }
    
    getAll(): AgentDefinition[] {
        return Array.from(this.agents.values());
    }
    
    loadAll(): void {
        // 1. 加载内置 Agent
        for (const agent of builtInAgents) {
            this.register(agent);
        }
        
        // 2. 加载磁盘 Agent
        const diskAgents = loadDiskAgents(getAgentsDir());
        for (const agent of diskAgents) {
            this.register(agent);
        }
        
        console.log(`[AgentRegistry] Loaded ${this.agents.size} agents`);
    }
}

export const agentRegistry = new AgentRegistry();
```

#### P9-4-2e: Agent 目录路径管理
```typescript
export function getAgentsDir(): string {
    return join(homedir(), '.claude', 'agents');
}

export function getAgentDefinitionPath(agentName: string): string {
    return join(getAgentsDir(), agentName, 'AGENT.md');
}
```

#### P9-4-2f: Agent 加载初始化
**在应用启动时调用**：
```typescript
// my-agent/src/index.ts
import { agentRegistry } from './agents/registry';

// 应用启动时加载所有 Agent
agentRegistry.loadAll();
```

#### P9-4-2g: 创建示例磁盘 Agent
**文件**: `~/.claude/agents/test-writer/AGENT.md`

```markdown
---
name: test-writer
description: Writes unit tests for code
whenToUse: When you need to create or update tests
tools:
  - read_file
  - write_file
  - bash
disallowedTools:
  - agent  # 防止递归
---

# Test Writer Agent

You are a test writing specialist.

Your job is to:
1. Read the code file provided
2. Understand its functionality
3. Write comprehensive unit tests
4. Use the appropriate testing framework

Guidelines:
- Write clear test names
- Cover edge cases
- Include both positive and negative tests
- Follow the project's testing conventions
```

#### P9-4-2h: Agent 列表 UI 显示
```typescript
// 在系统提示词中显示所有可用 Agent
export function buildAgentListSection(): string {
    const agents = agentRegistry.getAll();
    
    let section = '## Available Agents\n\n';
    for (const agent of agents) {
        section += `- **${agent.name}** (${agent.source}): ${agent.whenToUse}\n`;
        section += `  Tools: ${agent.tools?.length ? agent.tools.join(', ') : 'All'}\n`;
    }
    
    return section;
}
```

---

### Phase 3: Fork Subagent 机制（7 个任务）

#### P9-4-3a: 理解 Fork vs Fresh Agent

**Fork Agent**（共享上下文）：
```typescript
// 用户调用
agent({
    // 不指定 subagent_type → Fork
    description: "research task",
    prompt: "Find all usages of useState"
})

// 行为：
// - 继承父 Agent 的完整对话历史
// - 共享 prompt cache（性能优化）
// - 不需要重新解释背景
// - 提示词是"指令"（directive），而非完整描述
```

**Fresh Agent**（独立上下文）：
```typescript
// 用户调用
agent({
    subagent_type: "explore",  // 指定类型 → Fresh
    description: "explore codebase",
    prompt: "Complete task description with full context"
})

// 行为：
// - 空白的对话历史
// - 不共享父 Agent 的上下文
// - 需要完整的任务描述
// - 提示词是"简报"（briefing），包含所有背景
```

#### P9-4-3b: Fork 判断逻辑
```typescript
function isForkAgent(input: AgentToolInput): boolean {
    // 如果没有指定 subagent_type → Fork
    return !input.subagent_type;
}
```

#### P9-4-3c: Fork Agent 的上下文继承
```typescript
export function createForkAgentDeps(parentDeps: AgentDeps): AgentDeps {
    // 1. 复制父 Agent 的对话历史
    const parentHistory = parentDeps.getHistory();
    
    // 2. 创建新的 deps，但复制历史
    const forkDeps = new AgentDeps({
        isSubAgent: true,
        isFork: true,
        agentType: 'fork',
        parentAgentId: parentDeps.getAgentInfo().sessionId
    });
    
    // 3. 复制对话历史
    for (const message of parentHistory) {
        forkDeps.addMessageWithoutPersist(message);  // 不持久化，只在内存中
    }
    
    // 4. 复制文件读取状态
    const parentFileState = parentDeps.getReadFileState();
    for (const [path, state] of parentFileState.entries()) {
        forkDeps.markFileAsRead(path, state.content);
    }
    
    return forkDeps;
}
```

#### P9-4-3d: Fork 提示词格式
```typescript
// Fork 的提示词是"指令式"的
const forkPromptExample = `
Find all usages of the useState hook in the codebase.
Report file paths and line numbers.
`;

// Fresh Agent 的提示词是"完整描述"
const freshPromptExample = `
Context: We're refactoring our React components to use Zustand instead of useState.

Task: Find all usages of the useState hook in the src/ directory.

Background: This is a React project with TypeScript. We've been using functional components with hooks. Some components use multiple useState calls.

Expected output: A list of files with line numbers where useState is used.
`;
```

#### P9-4-3e: Fork Agent 系统提示词
```typescript
function buildForkAgentSystemPrompt(parentPrompt: string): string {
    return `${parentPrompt}

---

**🔀 Fork Agent 模式**

你是父 Agent 的一个 Fork。你继承了父 Agent 的完整上下文。

重要规则：
- 你已经知道项目背景，不需要重新了解
- 你的任务是执行特定的指令
- 完成后，简洁地报告结果
- 不要重复父 Agent 已经做过的工作
`;
}
```

#### P9-4-3f: Fork 与 Fresh 的性能差异
```typescript
// Fork: 共享 prompt cache
// - 父 Agent 的系统提示词已经在 cache 中
// - Fork 直接复用，无需重新处理
// - 性能提升：~80% cache hit rate

// Fresh: 独立 cache
// - 需要构建新的系统提示词
// - 第一次调用无 cache
// - 性能较慢
```

#### P9-4-3g: 修改 AgentTool 支持 Fork
```typescript
async call(input: AgentToolInput, context): Promise<AgentToolOutput> {
    const isFork = isForkAgent(input);
    
    let subDeps: AgentDeps;
    
    if (isFork) {
        console.log('[AgentTool] 创建 Fork Agent（共享上下文）');
        subDeps = createForkAgentDeps(context.deps);
    } else {
        console.log('[AgentTool] 创建 Fresh Agent（独立上下文）');
        subDeps = createSubAgentDeps(input.subagent_type!, context.deps);
    }
    
    // ... 运行子 Agent
}
```

---

### Phase 4: Agent 工具解析（6 个任务）

#### P9-4-4a: resolveAgentTools 核心逻辑
```typescript
/**
 * 解析 Agent 可用的工具列表
 * 
 * 逻辑：
 * 1. 从所有工具开始
 * 2. 应用父 Agent 的工具限制
 * 3. 应用子 Agent 的工具白名单
 * 4. 应用子 Agent 的工具黑名单
 * 5. 添加 MCP 工具
 */
export function resolveAgentTools(
    agentDef: AgentDefinition,
    parentTools: string[] | undefined,
    mcpTools: Tool[]
): Tool[] {
    // 1. 获取所有注册的工具
    let availableTools = toolRegistry.getAllTools();
    
    // 2. 如果父 Agent 有工具限制，继承它
    if (parentTools && parentTools.length > 0) {
        availableTools = availableTools.filter(t => 
            parentTools.includes(t.name)
        );
    }
    
    // 3. 应用子 Agent 的白名单
    if (agentDef.tools && agentDef.tools.length > 0) {
        availableTools = availableTools.filter(t =>
            agentDef.tools!.includes(t.name)
        );
    }
    
    // 4. 应用子 Agent 的黑名单
    if (agentDef.disallowedTools && agentDef.disallowedTools.length > 0) {
        availableTools = availableTools.filter(t =>
            !agentDef.disallowedTools!.includes(t.name)
        );
    }
    
    // 5. 添加 MCP 工具
    availableTools = [...availableTools, ...mcpTools];
    
    // 6. 去重
    const toolNames = new Set<string>();
    return availableTools.filter(t => {
        if (toolNames.has(t.name)) return false;
        toolNames.add(t.name);
        return true;
    });
}
```

#### P9-4-4b: 工具继承示例
```
主 Agent（general-purpose）
  → 工具: [read_file, write_file, bash, agent]
    ↓
  启动子 Agent（explore）
    → 白名单: [read_file, bash]
    → 实际工具: [read_file, bash]  (白名单生效)
      ↓
    子 Agent 启动孙 Agent（test-runner）
      → 白名单: [read_file, bash, write_file]
      → 父工具限制: [read_file, bash]
      → 实际工具: [read_file, bash]  (受父限制)
```

#### P9-4-4c: MCP 工具动态加载
```typescript
async function loadAgentMcpTools(
    agentDef: AgentDefinition
): Promise<Tool[]> {
    if (!agentDef.mcpServers || agentDef.mcpServers.length === 0) {
        return [];
    }
    
    const tools: Tool[] = [];
    
    for (const serverName of agentDef.mcpServers) {
        try {
            // 连接 MCP 服务器
            const client = await connectToMcpServer(serverName);
            
            // 获取工具
            const serverTools = await client.listTools();
            
            // 转换为内部 Tool 格式
            tools.push(...serverTools.map(convertMcpToolToTool));
            
        } catch (error) {
            console.error(`[Agent] 无法加载 MCP 服务器: ${serverName}`, error);
        }
    }
    
    return tools;
}
```

#### P9-4-4d: Agent 特定的工具权限
```typescript
// 某些工具对某些 Agent 类型禁用
const TOOL_RESTRICTIONS: Record<string, string[]> = {
    'agent': ['agent'],  // Agent 工具不能递归调用自己
    'explore': ['agent', 'write_file'],  // 探索 Agent 不能写文件或创建子 Agent
};

export function checkToolRestrictions(
    agentType: string,
    toolName: string
): boolean {
    const restrictions = TOOL_RESTRICTIONS[agentType];
    if (!restrictions) return true;
    return !restrictions.includes(toolName);
}
```

#### P9-4-4e: 工具元数据传递
```typescript
// 子 Agent 的工具可能需要特殊配置
export interface ToolContext {
    agentId: string;
    agentType: string;
    isSubAgent: boolean;
    parentAgentId?: string;
}

// 工具调用时传递上下文
const toolContext: ToolContext = {
    agentId: subDeps.getAgentInfo().sessionId,
    agentType: agentDef.name,
    isSubAgent: true,
    parentAgentId: context.deps.getAgentInfo().sessionId
};
```

#### P9-4-4f: 更新 AgentTool 使用 resolveAgentTools
```typescript
async call(input: AgentToolInput, context): Promise<AgentToolOutput> {
    // ...
    
    // 解析工具
    const mcpTools = await loadAgentMcpTools(agentDef);
    const parentTools = context.allowedTools;  // 从父 Agent 继承
    const resolvedTools = resolveAgentTools(agentDef, parentTools, mcpTools);
    
    // 设置工具白名单
    toolRegistry.setAllowedTools(resolvedTools.map(t => t.name));
    
    // ...
}
```

---

### Phase 5: Agent Transcript 管理（5 个任务）

#### P9-4-5a: Transcript 目录结构
```
~/.claude/projects/<project>/
└── <main-session-id>/
    ├── <main-session-id>.jsonl          # 主 Agent transcript
    ├── subagents/
    │   ├── agent-<sub-id-1>.jsonl       # 子 Agent 1 transcript
    │   ├── agent-<sub-id-1>.meta.json   # 子 Agent 1 元数据
    │   ├── agent-<sub-id-2>.jsonl       # 子 Agent 2 transcript
    │   └── agent-<sub-id-2>.meta.json   # 子 Agent 2 元数据
    └── worktrees/                        # Worktree 相关（可选）
```

#### P9-4-5b: 子 Agent Transcript 路径
```typescript
export function getSubagentTranscriptPath(
    parentSessionId: string,
    agentId: string
): string {
    const projectDir = getProjectDir();
    return join(
        projectDir,
        parentSessionId,
        'subagents',
        `agent-${agentId}.jsonl`
    );
}

export function getSubagentMetadataPath(
    parentSessionId: string,
    agentId: string
): string {
    return getSubagentTranscriptPath(parentSessionId, agentId)
        .replace('.jsonl', '.meta.json');
}
```

#### P9-4-5c: Agent 元数据
```typescript
export interface AgentMetadata {
    agentId: string;
    agentType: string;
    parentAgentId: string;
    description: string;
    createdAt: string;
    completedAt?: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    worktreePath?: string;
    worktreeBranch?: string;
}

export function writeAgentMetadata(
    parentSessionId: string,
    agentId: string,
    metadata: AgentMetadata
): void {
    const path = getSubagentMetadataPath(parentSessionId, agentId);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(metadata, null, 2));
}
```

#### P9-4-5d: 修改 SessionStorage 支持子 Agent
```typescript
export class SessionStorage {
    // ... 现有方法 ...
    
    /**
     * 获取子 Agent 的 transcript 路径
     */
    getSubagentTranscriptPath(parentSessionId: string, agentId: string): string {
        const dir = this.getSessionDir();
        return join(dir, parentSessionId, 'subagents', `agent-${agentId}.jsonl`);
    }
    
    /**
     * 为子 Agent 追加 entry
     */
    appendSubagentEntry(
        parentSessionId: string,
        agentId: string,
        entry: SessionEntry
    ): void {
        const path = this.getSubagentTranscriptPath(parentSessionId, agentId);
        
        // 确保目录存在
        mkdirSync(dirname(path), { recursive: true });
        
        // 追加
        const line = JSON.stringify(entry) + '\n';
        appendFileSync(path, line, 'utf-8');
    }
}
```

#### P9-4-5e: 修改 AgentDeps 持久化逻辑
```typescript
class AgentDeps {
    // ...
    
    private persistMessage(message: Message): void {
        const entries = this.messageToEntry(message);
        
        for (const entry of entries) {
            if (this.isSubAgent) {
                // 子 Agent：写入子 Agent 的 transcript
                sessionStorage.appendSubagentEntry(
                    this.parentAgentId!,
                    this.sessionId,
                    entry
                );
            } else {
                // 主 Agent：写入主 transcript
                sessionStorage.appendEntry(this.sessionId, entry);
            }
        }
    }
}
```

---

### Phase 6: 后台任务执行（4 个任务）

#### P9-4-6a: 后台任务的概念
```typescript
// 前台任务（默认）：阻塞主 Agent，等待完成
agent({
    subagent_type: "explore",
    description: "explore codebase",
    prompt: "Find all TypeScript files"
    // run_in_background: false (默认)
});
// 主 Agent 等待子 Agent 完成后才继续

// 后台任务：非阻塞，主 Agent 立即继续
agent({
    subagent_type: "test-runner",
    description: "run tests",
    prompt: "Run all unit tests",
    run_in_background: true  // ← 关键
});
// 主 Agent 立即收到"任务已启动"的回复
// 子 Agent 在后台运行
// 完成后，主 Agent 收到通知
```

#### P9-4-6b: 后台任务的实现架构
```typescript
// 使用 Node.js 的 Worker Threads 或 Child Process
import { Worker } from 'worker_threads';

async function runAgentInBackground(
    agentDef: AgentDefinition,
    prompt: string,
    outputFile: string
): Promise<string> {
    // 1. 创建 Worker
    const worker = new Worker('./agentWorker.js', {
        workerData: {
            agentType: agentDef.name,
            prompt,
            outputFile
        }
    });
    
    // 2. 后台运行，不等待
    worker.on('message', (message) => {
        if (message.type === 'completed') {
            // 通知主 Agent
            notifyAgentCompletion(message.agentId, message.result);
        }
    });
    
    // 3. 立即返回（不阻塞）
    return `后台任务已启动，输出文件: ${outputFile}`;
}
```

#### P9-4-6c: 后台任务的通知机制
```typescript
// 后台任务完成后，需要通知主 Agent

// 方式 1：通过文件轮询
export function checkBackgroundTaskCompletion(agentId: string): boolean {
    const metadataPath = getSubagentMetadataPath(parentSessionId, agentId);
    if (!existsSync(metadataPath)) return false;
    
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
    return metadata.status === 'completed';
}

// 方式 2：通过 IPC（Inter-Process Communication）
// Worker 发送消息给主进程
worker.postMessage({
    type: 'agent_completed',
    agentId,
    result
});

// 主进程监听
process.on('message', (msg) => {
    if (msg.type === 'agent_completed') {
        // 在主 Agent 的下一轮对话中插入通知
        insertNotificationMessage(msg.agentId, msg.result);
    }
});
```

#### P9-4-6d: 修改 AgentTool 支持后台任务
```typescript
async call(input: AgentToolInput, context): Promise<AgentToolOutput> {
    const isBackground = input.run_in_background || false;
    
    if (isBackground) {
        // 后台执行
        const outputFile = `/tmp/agent-${agentId}-output.txt`;
        
        runAgentInBackground(agentDef, input.prompt, outputFile);
        
        return {
            result: `后台任务已启动。完成后你会收到通知。`,
            message_count: 0,
            agent_type: input.subagent_type || 'general-purpose',
            agent_id: agentId,
            is_background: true,
            output_file: outputFile
        };
        
    } else {
        // 前台执行（阻塞）
        await runAgent(input.prompt, subDeps);
        // ... 正常流程
    }
}
```

---

### Phase 7: Worktree 隔离（4 个任务）

#### P9-4-7a: Worktree 的概念
```bash
# Git Worktree 允许同一个仓库有多个工作目录
# 每个 worktree 有独立的文件系统，但共享 Git 历史

# 主仓库
/Users/me/project/
├── .git/
├── src/
└── package.json

# 创建 worktree
git worktree add /tmp/worktree-abc123 -b feature-branch

# Worktree 目录
/tmp/worktree-abc123/
├── src/
└── package.json

# 好处：子 Agent 可以随意修改，不影响主仓库
```

#### P9-4-7b: Worktree 创建逻辑
```typescript
import { execSync } from 'child_process';

export async function createWorktree(
    agentId: string,
    baseBranch: string = 'main'
): Promise<{ path: string; branch: string }> {
    // 1. 生成唯一的 worktree 路径
    const worktreePath = join(tmpdir(), `agent-worktree-${agentId}`);
    
    // 2. 生成分支名
    const branchName = `agent/${agentId}`;
    
    // 3. 创建 worktree
    try {
        execSync(
            `git worktree add ${worktreePath} -b ${branchName} ${baseBranch}`,
            { cwd: process.cwd(), stdio: 'inherit' }
        );
        
        console.log(`[Worktree] 创建成功: ${worktreePath} (${branchName})`);
        
        return { path: worktreePath, branch: branchName };
        
    } catch (error) {
        throw new Error(`创建 worktree 失败: ${error}`);
    }
}
```

#### P9-4-7c: Worktree 清理逻辑
```typescript
export async function cleanupWorktree(
    worktreePath: string,
    branchName: string,
    hasChanges: boolean
): Promise<void> {
    try {
        if (hasChanges) {
            // 有修改：保留 worktree 和分支
            console.log(`[Worktree] 保留 worktree（有修改）: ${worktreePath}`);
            return;
        }
        
        // 无修改：删除 worktree 和分支
        execSync(`git worktree remove ${worktreePath}`, {
            cwd: process.cwd(),
            stdio: 'inherit'
        });
        
        execSync(`git branch -D ${branchName}`, {
            cwd: process.cwd(),
            stdio: 'inherit'
        });
        
        console.log(`[Worktree] 清理完成: ${worktreePath}`);
        
    } catch (error) {
        console.error(`[Worktree] 清理失败:`, error);
    }
}
```

#### P9-4-7d: 修改 AgentTool 支持 Worktree
```typescript
async call(input: AgentToolInput, context): Promise<AgentToolOutput> {
    let worktreeInfo: { path: string; branch: string } | undefined;
    
    if (input.isolation === 'worktree') {
        // 创建 worktree
        worktreeInfo = await createWorktree(agentId);
        
        // 修改工作目录
        process.chdir(worktreeInfo.path);
    }
    
    try {
        // 运行子 Agent
        await runAgent(input.prompt, subDeps);
        
        // 检查是否有修改
        const hasChanges = checkGitChanges(worktreeInfo?.path);
        
        return {
            // ...
            worktree_path: worktreeInfo?.path,
            worktree_branch: worktreeInfo?.branch
        };
        
    } finally {
        // 恢复工作目录
        if (worktreeInfo) {
            process.chdir(context.originalCwd);
            
            // 清理 worktree
            await cleanupWorktree(
                worktreeInfo.path,
                worktreeInfo.branch,
                hasChanges
            );
        }
    }
}
```

---

### Phase 8: Agent 恢复（3 个任务）

#### P9-4-8a: Agent 恢复的概念
```typescript
// 场景：用户中断了一个 Agent，想要继续

// 第一次调用
agent({
    subagent_type: "explore",
    description: "explore codebase",
    prompt: "Find all React components"
});
// Agent ID: abc123

// 用户中断（Ctrl+C）

// 恢复调用
agent({
    resume: "abc123",  // ← 指定要恢复的 Agent ID
    prompt: "继续探索，现在查找所有 hooks"
});
```

#### P9-4-8b: 恢复 Agent 的实现
```typescript
export async function resumeAgent(
    agentId: string,
    newPrompt: string,
    parentDeps: AgentDeps
): Promise<AgentDeps> {
    // 1. 读取 Agent 元数据
    const metadata = readAgentMetadata(parentSessionId, agentId);
    if (!metadata) {
        throw new Error(`Agent ${agentId} 不存在`);
    }
    
    // 2. 加载 Agent 的 transcript
    const transcript = sessionStorage.loadSubagentTranscript(
        parentSessionId,
        agentId
    );
    
    // 3. 重建 AgentDeps
    const resumedDeps = new AgentDeps({
        sessionId: agentId,  // 复用相同的 sessionId
        isSubAgent: true,
        agentType: metadata.agentType,
        parentAgentId: metadata.parentAgentId
    });
    
    // 4. 恢复对话历史
    const messages = entriesToMessages(transcript);
    for (const msg of messages) {
        resumedDeps.addMessageWithoutPersist(msg);
    }
    
    // 5. 添加新的用户消息
    resumedDeps.addMessage(createUserMessage(newPrompt));
    
    return resumedDeps;
}
```

#### P9-4-8c: 修改 AgentTool 支持恢复
```typescript
async call(input: AgentToolInput, context): Promise<AgentToolOutput> {
    let subDeps: AgentDeps;
    
    if (input.resume) {
        // 恢复现有 Agent
        console.log(`[AgentTool] 恢复 Agent: ${input.resume}`);
        subDeps = await resumeAgent(input.resume, input.prompt, context.deps);
        
    } else {
        // 创建新 Agent
        // ... 正常逻辑
    }
    
    // ... 运行
}
```

---

### Phase 9: Agent 通知和通信（2 个任务）

#### P9-4-9a: Agent 完成通知
```typescript
// 子 Agent 完成后，主 Agent 应该收到通知消息

export function createAgentCompletionNotification(
    agentId: string,
    agentType: string,
    description: string,
    result: string
): Message {
    return createUserMessage(
        `[Agent 完成通知]\n\n` +
        `Agent: ${agentType} (${agentId})\n` +
        `任务: ${description}\n` +
        `结果: ${result}`
    );
}

// 在 AgentTool 完成后，插入通知
if (!isBackground) {
    // 前台任务：立即插入通知到主 Agent 的历史
    const notification = createAgentCompletionNotification(
        agentId,
        agentType,
        input.description,
        result
    );
    context.deps.addMessage(notification);
}
```

#### P9-4-9b: SendMessageTool（与运行中的 Agent 通信）
```typescript
// 允许主 Agent 向运行中的子 Agent 发送消息

export const sendMessageTool: Tool = {
    name: 'send_message',
    description: 'Send a message to a running agent',
    inputSchema: {
        type: 'object',
        properties: {
            to: {
                type: 'string',
                description: 'Agent ID or name'
            },
            message: {
                type: 'string',
                description: 'Message content'
            }
        },
        required: ['to', 'message']
    },
    
    async call(input, context): Promise<ToolOutput> {
        const targetAgentId = resolveAgentId(input.to);
        
        // 找到目标 Agent 的 deps
        const targetDeps = getAgentDeps(targetAgentId);
        if (!targetDeps) {
            throw new Error(`Agent ${input.to} not found`);
        }
        
        // 添加用户消息到目标 Agent
        targetDeps.addMessage(createUserMessage(input.message));
        
        // 唤醒目标 Agent（如果它在等待）
        wakeupAgent(targetAgentId);
        
        return {
            result: `消息已发送到 Agent ${input.to}`
        };
    }
};
```

