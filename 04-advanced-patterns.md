# Part 4: Advanced Patterns

> Master multi-agent systems, MCP, plugins, and sophisticated architectures

**Duration**: 2 weeks
**Prerequisites**: Parts 1-3

---

## Table of Contents

1. [Multi-Agent Systems](#multi-agent-systems)
2. [Sub-Agent Spawning](#sub-agent-spawning)
3. [Model Context Protocol (MCP)](#model-context-protocol-mcp)
4. [Plugin Architecture](#plugin-architecture)
5. [Memory Systems](#memory-systems)
6. [Skills System](#skills-system)
7. [Context Compression](#context-compression)
8. [Hands-On Exercises](#hands-on-exercises)

---

## Multi-Agent Systems

### Why Multiple Agents?

**Single agent limitations**:
- One context window (runs out of space)
- One focus area (can't multitask)
- One conversation thread (gets confused with parallel work)

**Multi-agent benefits**:
- Parallel execution (faster)
- Specialized agents (better quality)
- Isolated contexts (cleaner reasoning)
- Scalability (distribute work)

### Agent Hierarchy

```
┌────────────────────────────────────────────────┐
│           Main Agent (Coordinator)             │
│   "Build a web app with auth and payments"    │
└─────────────┬──────────────────────────────────┘
              │
       ┌──────┴──────┬────────────┐
       ▼             ▼            ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Sub-Agent  │ │  Sub-Agent  │ │  Sub-Agent  │
│   "Auth"    │ │  "Payments" │ │    "UI"     │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │               │                │
    [Tools]        [Tools]          [Tools]
```

### Agent Types in Claude Code

**Location**: `src/tools/AgentTool/builtInAgents.ts`

| Agent Type | Purpose | Tools Available |
|------------|---------|-----------------|
| `general-purpose` | Research, search, multi-step tasks | All tools |
| `Explore` | Fast codebase exploration | Read, Glob, Grep |
| `Plan` | Task planning | Read, Glob, Grep |
| Custom agents | User-defined specialized agents | User-specified |

---

## Sub-Agent Spawning

### The AgentTool

**Location**: `src/tools/AgentTool/AgentTool.tsx`

```typescript
// Main agent calls AgentTool to spawn sub-agent
{
  type: "tool_use",
  name: "Task",
  input: {
    subagent_type: "Explore",
    prompt: "Find all API endpoints in the codebase",
    description: "Exploring codebase for API endpoints"
  }
}
```

### Sub-Agent Lifecycle

```
┌─────────────────────────────────────────────────┐
│        SUB-AGENT EXECUTION LIFECYCLE            │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. Main Agent calls Task tool                  │
│     input: {subagent_type, prompt}              │
│          ↓                                      │
│  2. AgentTool creates new QueryEngine           │
│     - Fresh message history                     │
│     - Specialized tool subset                   │
│     - Independent context                       │
│          ↓                                      │
│  3. Sub-agent executes autonomously             │
│     - Calls tools                               │
│     - Reasons about task                        │
│     - Iterates until complete                   │
│          ↓                                      │
│  4. Sub-agent returns final report              │
│     - Summary of findings                       │
│     - Key results                               │
│     - Recommendations                           │
│          ↓                                      │
│  5. Main agent receives report                  │
│     - Uses info to continue                     │
│     - May spawn more sub-agents                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Implementation Pattern

```typescript
// AgentTool.tsx (simplified)
export const AgentTool = buildTool({
  name: "Task",

  async execute(input, context) {
    // 1. Select agent definition
    const agentDef = getAgentDefinition(input.subagent_type)

    // 2. Configure sub-agent QueryEngine
    const subAgentConfig: QueryEngineConfig = {
      cwd: context.cwd,
      tools: selectToolsForAgent(agentDef),  // Subset of tools
      initialMessages: [
        {
          role: 'user',
          content: input.prompt
        }
      ],
      maxTurns: agentDef.maxTurns || 50,
      customSystemPrompt: agentDef.systemPrompt
    }

    // 3. Run sub-agent
    const result = await query(subAgentConfig)

    // 4. Extract final message
    const finalMessage = result.messages[result.messages.length - 1]

    // 5. Return to main agent
    return {
      agentType: input.subagent_type,
      result: finalMessage.content,
      turnCount: result.turnCount,
      cost: result.totalCost
    }
  }
})
```

### Agent Configuration

```typescript
// Define a custom agent
type AgentDefinition = {
  name: string
  description: string
  systemPrompt: string
  availableTools: string[]  // Tool names
  maxTurns?: number
  model?: string
}

// Example: CodeReviewer agent
const codeReviewerAgent: AgentDefinition = {
  name: "code-reviewer",
  description: "Reviews code for bugs, style, and best practices",
  systemPrompt: `You are an expert code reviewer.
    Focus on:
    - Security vulnerabilities
    - Performance issues
    - Code style and readability
    - Best practices`,
  availableTools: [
    "Read",
    "Grep",
    "Glob",
    "AskUserQuestion"
  ],
  maxTurns: 20
}
```

### Team Agents (Parallel Sub-Agents)

**Location**: `src/tools/TeamCreateTool/`

```typescript
// Main agent creates a team
{
  type: "tool_use",
  name: "TeamCreate",
  input: {
    teammates: [
      {
        name: "frontend",
        prompt: "Build the React UI components",
        tools: ["Read", "Write", "Edit"]
      },
      {
        name: "backend",
        prompt: "Create the API endpoints",
        tools: ["Read", "Write", "Bash"]
      },
      {
        name: "tests",
        prompt: "Write integration tests",
        tools: ["Read", "Write", "Bash"]
      }
    ]
  }
}

// All teammates execute IN PARALLEL
// Main agent coordinates their work
```

---

## Model Context Protocol (MCP)

### What is MCP?

**MCP** = Model Context Protocol

A standardized way for LLM applications to:
- Connect to external data sources
- Integrate third-party tools
- Access remote resources
- Share context across systems

**Think of it as**: USB for AI agents

### MCP Architecture

```
┌──────────────────────────────────────┐
│       Claude Code (Client)           │
└──────────────┬───────────────────────┘
               │
        ┌──────┴──────┬────────────┬───────────┐
        ▼             ▼            ▼           ▼
┌──────────────┐ ┌──────────┐ ┌─────────┐ ┌─────────┐
│ MCP Server   │ │   MCP    │ │   MCP   │ │   MCP   │
│   GitHub     │ │  Notion  │ │ Postgres│ │   ...   │
└──────────────┘ └──────────┘ └─────────┘ └─────────┘
  Provides:        Provides:    Provides:    Provides:
  - PRs            - Pages      - Queries    - ...
  - Issues         - Blocks     - Tables
  - Repos          - Databases  - Rows
```

### MCP Components

**Location**: `src/services/mcp/`

1. **Tools**: Functions the agent can call
2. **Resources**: Data the agent can read
3. **Prompts**: Pre-defined prompt templates

### MCP Tool Example

```typescript
// MCP Server exposes a tool
{
  name: "github__create_issue",
  description: "Create a GitHub issue",
  inputSchema: {
    type: "object",
    properties: {
      repo: {type: "string"},
      title: {type: "string"},
      body: {type: "string"}
    }
  }
}

// Claude Code discovers and uses it
{
  type: "tool_use",
  name: "mcp__github__create_issue",
  input: {
    repo: "myorg/myrepo",
    title: "Bug: Login fails",
    body: "Description of bug..."
  }
}

// MCP client routes to GitHub server
// Server executes → Returns result
// Result flows back to Claude
```

### MCP Resource Example

```typescript
// MCP Server exposes resources
{
  uri: "notion://databases/tasks",
  name: "Task Database",
  mimeType: "application/json"
}

// Claude Code reads resource
{
  type: "tool_use",
  name: "ReadMcpResource",
  input: {
    uri: "notion://databases/tasks"
  }
}

// Returns: Task data from Notion
```

### Configuring MCP Servers

**Location**: `~/.config/claude-code/mcp-servers.json`

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_..."
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "postgresql://..."
      }
    }
  }
}
```

### MCP Client Implementation

**From** `src/services/mcp/client.ts`

```typescript
// Connect to MCP server
async function connectToMCPServer(
  config: McpServerConfig
): Promise<MCPServerConnection> {
  // 1. Spawn server process
  const process = spawn(config.command, config.args, {
    env: config.env
  })

  // 2. Create stdio transport
  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args
  })

  // 3. Create MCP client
  const client = new Client({
    name: "claude-code",
    version: "1.0.0"
  }, {
    capabilities: {
      tools: {},
      resources: {}
    }
  })

  // 4. Connect
  await client.connect(transport)

  // 5. List available tools and resources
  const tools = await client.listTools()
  const resources = await client.listResources()

  return {
    name: config.name,
    client,
    tools,
    resources
  }
}
```

---

## Plugin Architecture

### What are Plugins?

**Plugins** extend Claude Code's functionality:

- Add custom tools
- Add custom commands
- Add custom UI components
- Hook into lifecycle events

### Plugin Structure

```
my-plugin/
├── package.json
├── src/
│   ├── index.ts           # Plugin entry point
│   ├── tools/             # Custom tools
│   ├── commands/          # Custom commands
│   └── hooks/             # Lifecycle hooks
└── README.md
```

### Plugin Interface

```typescript
type Plugin = {
  name: string
  version: string

  // Initialization
  initialize?: (context: PluginContext) => Promise<void>

  // Provide tools
  tools?: Tool[]

  // Provide commands
  commands?: Command[]

  // Lifecycle hooks
  hooks?: {
    onToolUse?: (tool: string, input: unknown) => void
    onQueryStart?: (query: string) => void
    onQueryEnd?: (result: QueryResult) => void
  }
}
```

### Example Plugin

```typescript
// my-plugin/src/index.ts
export default {
  name: "my-plugin",
  version: "1.0.0",

  async initialize(context) {
    console.log("Plugin initialized!")
  },

  tools: [
    {
      name: "MyCustomTool",
      description: "Does something cool",
      inputSchema: z.object({
        input: z.string()
      }),
      async execute(input) {
        return { result: "Cool!" }
      }
    }
  ],

  commands: [
    {
      name: "/mycmd",
      description: "My custom command",
      async execute(args) {
        console.log("Command executed!")
      }
    }
  ],

  hooks: {
    onToolUse(tool, input) {
      console.log(`Tool used: ${tool}`)
    }
  }
}
```

### Loading Plugins

**Location**: `src/utils/plugins/pluginLoader.ts`

```typescript
async function loadPlugins(): Promise<Plugin[]> {
  const pluginDir = path.join(
    getConfigDir(),
    'plugins'
  )

  const pluginDirs = await fs.readdir(pluginDir)

  const plugins = await Promise.all(
    pluginDirs.map(async (dir) => {
      const pluginPath = path.join(pluginDir, dir)
      const plugin = await import(pluginPath)
      return plugin.default
    })
  )

  // Initialize plugins
  for (const plugin of plugins) {
    await plugin.initialize?.({
      configDir: getConfigDir(),
      workingDir: getCwd()
    })
  }

  return plugins
}
```

---

## Memory Systems

### Types of Memory

| Memory Type | Duration | Purpose | Storage |
|-------------|----------|---------|---------|
| **Short-term** | Single conversation | Context window | In-memory |
| **Session** | Current session | Resume support | Disk (session file) |
| **Long-term** | Persistent across sessions | Facts, preferences | Disk (memdir) |
| **Team memory** | Shared across agents | Coordination | Shared state |

### Long-Term Memory (memdir)

**Location**: `src/memdir/`

```
~/.config/claude-code/memory/
├── facts.md               # General facts
├── preferences.md         # User preferences
├── project-notes.md       # Project-specific notes
└── custom/                # User-created memory files
```

**Usage**:

```typescript
// Load memory into system prompt
const memoryContent = await loadMemoryPrompt()

systemPrompt += `\n\n## Memory\n${memoryContent}`

// Agent now "remembers" facts across sessions
```

**Example memory content**:

```markdown
## Facts
- User prefers TypeScript over JavaScript
- Project uses React with Vite
- Tests use Vitest
- API base URL: https://api.example.com

## Preferences
- Code style: 2 space indentation
- No semicolons
- Use const over let
```

### Session Persistence

**Location**: `src/utils/sessionStorage.ts`

```typescript
// Save session to disk
async function saveSession(messages: Message[]) {
  const sessionPath = path.join(
    getSessionDir(),
    `session-${Date.now()}.json`
  )

  await fs.writeFile(
    sessionPath,
    JSON.stringify({
      version: 1,
      timestamp: Date.now(),
      messages,
      context: getSystemContext()
    }, null, 2)
  )
}

// Resume session
async function resumeSession(sessionId: string) {
  const sessionPath = getSessionPath(sessionId)
  const data = await fs.readFile(sessionPath, 'utf-8')
  const session = JSON.parse(data)

  return session.messages
}
```

### Team Memory (Multi-Agent)

**Location**: `src/utils/swarm/`

```typescript
// Shared memory across team agents
type TeamMemory = {
  facts: Map<string, string>      // Shared facts
  progress: Map<string, Progress>  // Each agent's progress
  artifacts: Map<string, Artifact> // Shared outputs
}

// Agent A writes to team memory
teamMemory.facts.set("api-endpoint", "/api/users")

// Agent B reads from team memory
const endpoint = teamMemory.facts.get("api-endpoint")
```

---

## Skills System

### What are Skills?

**Skills** are reusable workflows:

- Pre-defined sequences of actions
- Can be invoked like tools
- Combine multiple tools
- Encapsulate domain knowledge

### Skill Structure

```typescript
type Skill = {
  name: string
  description: string
  prompt: string          // Instructions for the agent
  tools?: string[]        // Required tools
  examples?: Example[]    // Usage examples
}
```

### Built-in Skills

**Location**: `src/skills/bundled/`

| Skill | Purpose |
|-------|---------|
| `git-workflow` | Standard git operations |
| `code-review` | Review code changes |
| `test-generation` | Generate tests for code |
| `debug-assistant` | Help debug issues |

### Using Skills

```typescript
// User invokes skill
User: "/skill code-review"

// Skill expands to agent instructions
Agent receives prompt:
"""
You are performing a code review.

Steps:
1. Read the changed files (use git diff)
2. Check for:
   - Bugs
   - Security issues
   - Performance problems
   - Style violations
3. Provide feedback

Available tools: Read, Grep, Bash
"""
```

### Creating Custom Skills

```typescript
// ~/.config/claude-code/skills/my-skill.json
{
  "name": "deploy-app",
  "description": "Deploy the application to production",
  "prompt": `Deploy the application following these steps:

1. Run tests (npm test)
2. Build the app (npm run build)
3. Deploy to server (npm run deploy)
4. Verify deployment (curl health endpoint)
5. Report status

Be careful and ask for confirmation before deploying.`,
  "tools": ["Bash", "Read", "AskUserQuestion"]
}
```

---

## Context Compression

### Why Compress Context?

**Problem**: Conversations grow too large

```
Turn 1: Read file (10KB)
Turn 2: Analyze code (5KB)
Turn 3: Read another file (10KB)
Turn 4: Make changes (8KB)
Turn 5: Test changes (50KB of test output)
Turn 6: Debug (20KB of logs)

Total: 103KB in context!
```

**Solution**: Compress old turns

### Compression Strategies

#### 1. Snip Compaction

**Keep first N and last N turns, snip middle**:

```typescript
function snipCompress(
  messages: Message[],
  keepFirst: number,
  keepLast: number
): Message[] {
  if (messages.length <= keepFirst + keepLast) {
    return messages
  }

  const first = messages.slice(0, keepFirst)
  const last = messages.slice(-keepLast)

  const snipped = messages.length - keepFirst - keepLast

  return [
    ...first,
    {
      role: 'system',
      content: `[Snipped ${snipped} turns]`
    },
    ...last
  ]
}
```

#### 2. Summarization

**Use LLM to summarize old turns**:

```typescript
async function summarizeHistory(
  messages: Message[]
): Promise<Message[]> {
  // Extract old messages
  const oldMessages = messages.slice(0, -10)

  // Summarize with Claude
  const summary = await claudeAPI.messages.create({
    model: "claude-haiku-3-5",  // Fast, cheap model
    messages: [
      {
        role: 'user',
        content: `Summarize this conversation in 200 words:\n\n${
          JSON.stringify(oldMessages)
        }`
      }
    ]
  })

  // Replace old messages with summary
  return [
    {
      role: 'system',
      content: `Previous conversation summary:\n${summary.content}`
    },
    ...messages.slice(-10)  // Keep last 10
  ]
}
```

#### 3. Projection (Smart Selection)

**Keep only relevant messages**:

```typescript
async function projectRelevant(
  messages: Message[],
  currentTask: string
): Promise<Message[]> {
  // Score messages by relevance to current task
  const scored = messages.map(msg => ({
    message: msg,
    score: calculateRelevance(msg, currentTask)
  }))

  // Sort by score
  scored.sort((a, b) => b.score - a.score)

  // Keep top 50%
  return scored
    .slice(0, Math.floor(scored.length / 2))
    .map(s => s.message)
}
```

---

## Hands-On Exercises

### Exercise 1: Build a Multi-Agent System

Create a main agent that delegates to sub-agents:

```typescript
// Main agent task: "Build a todo app"
// Sub-agents:
// - "database" - Set up database schema
// - "api" - Build REST API
// - "frontend" - Build React UI

// Your task: Implement the coordination logic
```

### Exercise 2: Create an MCP Server

Build a simple MCP server:

```typescript
// weather-mcp-server.ts
// Expose weather data as MCP tools and resources

Tools:
- get_weather(city: string)
- get_forecast(city: string, days: number)

Resources:
- weather://current/{city}
- weather://forecast/{city}
```

### Exercise 3: Develop a Plugin

Create a plugin that adds a custom tool:

```typescript
// Plugin: Database query tool
// Tool: RunSQLQuery
// Input: SQL query string
// Output: Query results
// Safety: Only allow SELECT queries
```

### Exercise 4: Implement Memory

Build a memory system:

```typescript
// Features:
// - Save facts
// - Retrieve facts
// - Persist to disk
// - Load on startup

class MemorySystem {
  save(key: string, value: string): void
  get(key: string): string | undefined
  persist(): Promise<void>
  load(): Promise<void>
}
```

### Exercise 5: Compress a Conversation

Implement a compression algorithm:

```typescript
// Input: Long conversation (100 messages)
// Output: Compressed (20 messages)
// Preserve: Important context
// Remove: Redundant information
```

---

## Summary & Next Steps

### What You Learned

✅ Multi-agent systems distribute work
✅ Sub-agents solve specialized tasks
✅ MCP integrates external tools/data
✅ Plugins extend functionality
✅ Memory provides persistence
✅ Skills encapsulate workflows
✅ Compression manages context limits

### Key Takeaways

1. **Divide and conquer** - Multiple agents > single agent for complex tasks
2. **MCP is powerful** - Integrate any external system
3. **Plugins add flexibility** - Users can extend the system
4. **Memory matters** - Persistence across sessions is valuable
5. **Context is limited** - Always compress when needed

### Self-Check

Before Part 5, you should be able to:

- [ ] Spawn and coordinate sub-agents
- [ ] Integrate MCP servers
- [ ] Build a basic plugin
- [ ] Implement a memory system
- [ ] Compress conversation context
- [ ] Create reusable skills

### Next: Part 5 - Practical Exercises

In the final part, you'll:
- Build complete agent systems
- Solve real-world problems
- Apply all concepts learned
- Create production-ready agents

**Continue to** → [Part 5: Practical Exercises](./05-exercises.md)

---

*Last updated: March 31, 2026*
