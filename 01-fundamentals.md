# Part 1: Fundamentals

> Understanding the core architecture and concepts of AI agents

**Duration**: 1-2 weeks
**Prerequisites**: TypeScript, async/await, basic LLM knowledge

---

## Table of Contents

1. [What is an AI Agent?](#what-is-an-ai-agent)
2. [Claude Code Overview](#claude-code-overview)
3. [Architecture Deep-Dive](#architecture-deep-dive)
4. [Execution Flow](#execution-flow)
5. [Core Components](#core-components)
6. [File Structure Guide](#file-structure-guide)
7. [Key Design Patterns](#key-design-patterns)
8. [Hands-On: First Exploration](#hands-on-first-exploration)

---

## What is an AI Agent?

### Definition

An **AI agent** is a system that:

1. **Perceives** its environment (reads files, gets context)
2. **Reasons** about what to do (using an LLM)
3. **Acts** on the environment (executes tools)
4. **Iterates** until the goal is achieved

### The Tool-Calling Loop

This is the fundamental pattern powering all AI agents:

```
┌─────────────────────────────────────────────────────────┐
│                  AI AGENT LOOP                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. User Input: "Fix the bug in app.ts"                │
│          ↓                                              │
│  2. LLM Reasoning:                                      │
│     "I need to read the file first"                     │
│          ↓                                              │
│  3. Tool Call: Read("app.ts")                           │
│          ↓                                              │
│  4. Tool Result: [file contents...]                     │
│          ↓                                              │
│  5. LLM Reasoning:                                      │
│     "Found the bug on line 42, need to fix it"          │
│          ↓                                              │
│  6. Tool Call: Edit("app.ts", line=42, ...)             │
│          ↓                                              │
│  7. Tool Result: "Success"                              │
│          ↓                                              │
│  8. LLM Response: "Fixed the bug!"                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Contrast: Agent vs Simple Chatbot

| Simple Chatbot | AI Agent |
|----------------|----------|
| Takes input → Generates text | Takes input → **Calls tools** → Generates text |
| No environment interaction | **Reads files, runs commands, edits code** |
| Single request-response | **Multi-turn loops until completion** |
| Cannot verify its work | **Can test, debug, iterate** |

**Key insight**: Agents have **agency** - they can take actions and observe results.

---

## Claude Code Overview

### What is Claude Code?

Claude Code is a **production-grade AI coding assistant** that:

- Runs in your terminal
- Can read/write files, run commands, search code
- Uses Claude (Anthropic's LLM) as its reasoning engine
- Employs a sophisticated tool-calling system
- Handles permissions and safety

### Tech Stack

```
┌────────────────────────────────────────┐
│          Terminal UI (React)           │
│              + Ink                     │
├────────────────────────────────────────┤
│       Orchestration Layer              │
│    (QueryEngine + Tool System)         │
├────────────────────────────────────────┤
│         40+ Tools                      │
│  Bash │ FileRead │ Edit │ Grep │ ...   │
├────────────────────────────────────────┤
│       External Services                │
│  Claude API │ MCP │ LSP │ Git          │
└────────────────────────────────────────┘
```

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Runtime** | Bun | Fast JS runtime with native TypeScript |
| **Language** | TypeScript | Type safety for complex system |
| **UI** | React + Ink | Terminal UI with React components |
| **CLI** | Commander.js | Command-line argument parsing |
| **Validation** | Zod v4 | Runtime schema validation |
| **API** | Anthropic SDK | LLM communication |
| **Protocols** | MCP, LSP | External tool integration |

### Scale

- **~512,000 lines of code**
- **~1,900 TypeScript files**
- **40+ tools**
- **50+ slash commands**
- **140+ UI components**

---

## Architecture Deep-Dive

### High-Level Architecture

```
                    ┌──────────────┐
                    │     User     │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  main.tsx    │◄───── Entry point
                    │ (Commander)  │
                    └──────┬───────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼─────┐    ┌──────▼──────┐   ┌────▼─────┐
    │ Commands │    │   Tools     │   │   UI     │
    │ Registry │    │  Registry   │   │ (Ink)    │
    └────┬─────┘    └──────┬──────┘   └────┬─────┘
         │                 │                │
         └────────┬────────┴────────────────┘
                  │
          ┌───────▼────────┐
          │  QueryEngine   │◄───── Core orchestration
          └───────┬────────┘
                  │
       ┌──────────┼──────────┐
       │          │          │
  ┌────▼────┐ ┌──▼───┐  ┌───▼────┐
  │ Context │ │ Tools│  │ Claude │
  │ Manager │ │ Exec │  │  API   │
  └─────────┘ └──────┘  └────────┘
```

### Core Data Flow

```typescript
// 1. User input arrives
User: "Fix the bug"

// 2. Context is gathered
SystemContext = {
  platform: "darwin",
  workingDirectory: "/project",
  gitStatus: "...",
  // ... more context
}

// 3. QueryEngine orchestrates
QueryEngine.query({
  userMessage: "Fix the bug",
  systemContext: SystemContext,
  tools: [BashTool, FileReadTool, FileEditTool, ...],
  model: "claude-sonnet-4-5"
})

// 4. Claude API call
→ Claude API: {
    system: [SystemContext],
    messages: [{role: "user", content: "Fix the bug"}],
    tools: [...]
  }

// 5. Claude responds with tool call
← Claude API: {
    tool_use: {
      name: "Read",
      input: {file_path: "app.ts"}
    }
  }

// 6. Permission check
PermissionSystem.check(tool="Read", input={...})
→ Approved (read is safe)

// 7. Tool execution
FileReadTool.execute({file_path: "app.ts"})
→ Result: "const x = 1\nconst y = 2..."

// 8. Loop continues...
→ Claude API: {
    tool_result: "const x = 1..."
  }
← Claude API: {
    tool_use: {
      name: "Edit",
      input: {file_path: "app.ts", ...}
    }
  }
// ... until complete
```

---

## Execution Flow

### Startup Sequence

Located in: `src/main.tsx:1-100`

```typescript
// main.tsx - Optimized startup with parallel operations

// STEP 1: Parallel prefetch (runs BEFORE heavy imports)
profileCheckpoint('main_tsx_entry')
startMdmRawRead()          // Fetch MDM settings in background
startKeychainPrefetch()    // Fetch keychain credentials in background

// STEP 2: Heavy imports (while background tasks run)
import { QueryEngine } from './QueryEngine.js'
import { getTools } from './tools.js'
// ... ~135ms of imports

// STEP 3: Initialize systems
await init()                      // Auth, config, telemetry
await initializeGrowthBook()      // Feature flags
await loadPolicyLimits()          // Organization policies

// STEP 4: Load tools and commands
const tools = getTools(...)
const commands = getCommands(...)

// STEP 5: Render UI and start
await renderAndRun(<App />, ...)
```

**Performance optimization**: Notice how `startMdmRawRead()` and `startKeychainPrefetch()` fire **before** heavy imports. This parallelizes startup, saving ~65ms.

### Query Execution Flow

Located in: `src/QueryEngine.ts:1-150`

```typescript
// Simplified QueryEngine flow
export async function query(config: QueryEngineConfig) {
  // 1. Prepare context
  const systemPrompt = await fetchSystemPromptParts(...)
  const messages = prepareMessages(config.initialMessages)

  // 2. Main loop
  while (!done) {
    // 3. Call Claude API
    const response = await claudeAPI.messages.create({
      model: config.model,
      system: systemPrompt,
      messages: messages,
      tools: config.tools,
      stream: true  // Streaming for real-time updates
    })

    // 4. Process streaming response
    for await (const chunk of response) {
      if (chunk.type === 'tool_use') {
        // 5. Execute tool
        const result = await executeTool(chunk, config)

        // 6. Add result to message history
        messages.push(result)
      } else if (chunk.type === 'text') {
        // Display to user
        yield chunk.text
      }
    }

    // 7. Check if done (no more tool calls)
    if (noMoreToolCalls(response)) {
      done = true
    }
  }

  return messages
}
```

**Key concepts**:
- **Streaming**: Results appear in real-time
- **Loop**: Continues until Claude stops calling tools
- **State**: Message history accumulates with each turn

---

## Core Components

### 1. Tool System

**Location**: `src/Tool.ts`, `src/tools/`

Every tool implements this interface:

```typescript
// Tool.ts (simplified)
export type Tool = {
  // Tool metadata
  name: string
  description: string
  input_schema: ToolInputJSONSchema  // Zod schema converted to JSON

  // Permission configuration
  permission: {
    defaultMode: 'approve' | 'deny' | 'auto'
    dangerLevel: 'safe' | 'medium' | 'dangerous'
  }

  // Execution logic
  execute: (
    input: unknown,
    context: ToolUseContext
  ) => Promise<ToolResult>
}
```

**Example - BashTool structure**:

```
src/tools/BashTool/
├── BashTool.ts          # Main tool definition
├── BashToolSchema.ts    # Zod schema for inputs
├── executeBash.ts       # Execution logic
└── permissions.ts       # Permission rules
```

### 2. QueryEngine

**Location**: `src/QueryEngine.ts:130-150`

The **brain** of the agent. Responsibilities:

1. **Orchestrate** the tool-calling loop
2. **Manage** conversation state
3. **Handle** streaming responses
4. **Track** token usage and costs
5. **Implement** retry logic
6. **Enforce** timeouts and budgets

**Configuration type**:

```typescript
export type QueryEngineConfig = {
  cwd: string                          // Working directory
  tools: Tools                         // Available tools
  commands: Command[]                  // Slash commands
  mcpClients: MCPServerConnection[]    // MCP servers
  agents: AgentDefinition[]            // Sub-agent definitions
  canUseTool: CanUseToolFn            // Permission callback
  getAppState: () => AppState          // State getter
  setAppState: (f) => void             // State setter
  initialMessages?: Message[]          // Conversation history
  readFileCache: FileStateCache        // File read cache
  customSystemPrompt?: string          // Custom system instructions
  userSpecifiedModel?: string          // Model override
  thinkingConfig?: ThinkingConfig      // Extended thinking mode
  maxTurns?: number                    // Iteration limit
  maxBudgetUsd?: number               // Cost limit
}
```

### 3. Permission System

**Location**: `src/hooks/toolPermission/`, `src/types/permissions.ts`

**Permission modes**:

```typescript
type PermissionMode =
  | 'default'              // Ask user for dangerous operations
  | 'plan'                 // Ask for all operations (planning mode)
  | 'bypassPermissions'    // Auto-approve everything (dangerous!)
  | 'auto'                 // Auto-approve based on heuristics
```

**Permission flow**:

```
Tool Call
    ↓
Permission Check
    ├─ Safe tool (Read)? → Auto-approve
    ├─ Dangerous (Bash)? → Ask user
    │      ↓
    │  User approves? → Execute
    │  User denies? → Return error to Claude
    └─ Auto mode? → Execute
```

**Files to study**:
- `src/types/permissions.ts:40-47` - Type definitions
- `src/hooks/toolPermission/` - Permission hook implementation

### 4. Context System

**Location**: `src/context.ts`

Provides environmental awareness to the agent:

```typescript
// context.ts (simplified)
export function getSystemContext(): SystemPrompt {
  return {
    platform: getPlatform(),           // "darwin", "linux", "win32"
    workingDirectory: getCwd(),
    gitStatus: getGitStatus(),         // Current branch, uncommitted changes
    fileTree: getFileTree(),           // Project structure
    availableTools: getToolDescriptions(),
    currentDateTime: new Date().toISOString(),
    // ... more context
  }
}

export function getUserContext(): UserContext {
  return {
    preferences: getConfig(),
    mcpServers: getMcpConnections(),
    recentFiles: getRecentFiles(),
    // ... user-specific context
  }
}
```

This context is injected into every Claude API call as the system prompt.

### 5. Command System

**Location**: `src/commands.ts`, `src/commands/`

Slash commands are user-facing shortcuts:

```typescript
// Command type (simplified)
export type Command = {
  name: string           // "/commit", "/review"
  description: string
  execute: (args) => Promise<void>
}
```

**Examples**:
- `/commit` → Create git commit
- `/config` → Open settings
- `/mcp` → Manage MCP servers

Commands can trigger tool calls or UI flows.

---

## File Structure Guide

### Essential Files (Read These First)

```
src/
├── main.tsx                 # 🎯 START HERE - Entry point
├── Tool.ts                  # 🎯 Tool type definitions
├── tools.ts                 # Tool registry
├── QueryEngine.ts           # 🎯 Agent orchestration engine
├── commands.ts              # Command registry
└── context.ts               # System/user context
```

### Tool Implementations

```
src/tools/
├── BashTool/               # 🎯 START HERE - Simplest tool
│   ├── BashTool.ts
│   ├── BashToolSchema.ts
│   └── executeBash.ts
├── FileReadTool/           # 🎯 File reading (images, PDFs)
├── FileEditTool/           # String replacement editing
├── FileWriteTool/          # File creation
├── GrepTool/               # ripgrep search
├── GlobTool/               # File pattern matching
├── AgentTool/              # 🎯 Sub-agent spawning (advanced)
├── WebSearchTool/          # Web search
└── AskUserQuestionTool/    # Interactive prompts
```

### Services Layer

```
src/services/
├── api/                    # Claude API client
├── mcp/                    # Model Context Protocol
├── lsp/                    # Language Server Protocol
├── oauth/                  # Authentication
├── compact/                # Context compression
└── analytics/              # Telemetry & feature flags
```

### UI Components

```
src/components/
├── App.tsx                 # Main app component
├── MessageList.tsx         # Chat message display
├── Spinner.tsx             # Loading indicators
└── ... (140+ components)
```

### State Management

```
src/state/
├── AppState.tsx            # Global application state
└── ...
```

---

## Key Design Patterns

### 1. Lazy Loading

Heavy modules are loaded only when needed:

```typescript
// main.tsx:16-20
const REPLTool = process.env.USER_TYPE === 'ant'
  ? require('./tools/REPLTool/REPLTool.js').REPLTool
  : null  // Not loaded for regular users
```

**Why**: Faster startup (only load what you use)

### 2. Feature Flags (Dead Code Elimination)

```typescript
// tools.ts:26-28
const SleepTool = feature('PROACTIVE') || feature('KAIROS')
  ? require('./tools/SleepTool/SleepTool.js').SleepTool
  : null
```

Bun's `feature()` function enables **compile-time dead code elimination**:
- If feature is off → code is completely removed from bundle
- Reduces bundle size and improves security

### 3. Parallel Prefetch

```typescript
// main.tsx:1-20
// These run IN PARALLEL before heavy imports
startMdmRawRead()        // Subprocess 1
startKeychainPrefetch()  // Subprocess 2

// Heavy imports happen while above run
import { heavyModule } from './heavy.js'
```

**Result**: 65ms faster startup

### 4. Streaming Everything

```typescript
// QueryEngine uses async generators for streaming
async function* query(...) {
  for await (const chunk of apiResponse) {
    yield chunk  // Stream to UI immediately
  }
}
```

**Why**: Real-time user feedback, better UX

### 5. Layered Architecture

```
Presentation (React/Ink)
     ↓
Business Logic (QueryEngine, Tools)
     ↓
Services (API, MCP, LSP)
     ↓
External Systems (Claude API, Git, Shell)
```

Each layer is independent and testable.

### 6. Dependency Injection

```typescript
// QueryEngine doesn't import tools directly
export async function query(config: QueryEngineConfig) {
  const { tools, canUseTool, getAppState } = config  // Injected!
  // ...
}
```

**Benefits**: Testability, flexibility, no circular dependencies

---

## Hands-On: First Exploration

### Exercise 1: Trace a Simple Tool Call

**Goal**: Understand the flow from user input → tool execution → result

1. **Read** `src/tools/BashTool/BashTool.ts`
2. **Identify**:
   - Tool name and description
   - Input schema (what parameters does it accept?)
   - Permission settings
   - Execute function

3. **Trace the flow**:
   ```
   User: "Run ls -la"
   → QueryEngine receives user message
   → Calls Claude API
   → Claude returns: tool_use(name="Bash", input={command:"ls -la"})
   → QueryEngine calls BashTool.execute({command: "ls -la"})
   → BashTool runs command via child_process
   → Returns output
   → QueryEngine sends output back to Claude
   → Claude responds: "Here are the files..."
   ```

**Try it yourself**:
- Open `src/tools/BashTool/BashTool.ts`
- Find the `execute` function
- Understand how it runs shell commands

### Exercise 2: Map the Components

**Create a diagram** showing:

1. Entry point (`main.tsx`)
2. Tool registry (`tools.ts`)
3. QueryEngine (`QueryEngine.ts`)
4. A sample tool (`BashTool`)
5. Claude API connection

**Template**:
```
User Input
    ↓
[main.tsx] ──► [QueryEngine.ts]
                    ↓
              [Claude API]
                    ↓
              tool_use: Bash
                    ↓
         [BashTool.execute()]
                    ↓
              shell command
                    ↓
              tool result
                    ↓
              [Claude API]
                    ↓
              final response
```

### Exercise 3: Read a Complete Flow

**Pick one of these scenarios and trace it through the code**:

**Scenario A: File Read**
1. User: "Show me app.ts"
2. Claude calls `Read` tool
3. FileReadTool executes
4. Returns file contents
5. Claude displays to user

**Scenario B: Code Edit**
1. User: "Fix the bug on line 10"
2. Claude calls `Read` tool first
3. Analyzes the code
4. Calls `Edit` tool
5. Makes the change
6. Reports success

**Where to look**:
- `src/tools/FileReadTool/` for file reading
- `src/tools/FileEditTool/` for editing
- `src/QueryEngine.ts` for orchestration

### Exercise 4: Explore the Codebase

**Use these commands**:

```bash
# Count tools
ls src/tools/ | wc -l

# Find all tool definitions
grep -r "export.*Tool.*=" src/tools/ | head -20

# See tool schemas
find src/tools -name "*Schema.ts" | head -10

# Find permission configurations
grep -r "defaultMode" src/tools/ | head -10
```

**Questions to answer**:
1. How many tools are there?
2. Which tools require permission approval?
3. Which tools are marked as "dangerous"?
4. What's the most complex tool? (most lines of code)

---

## Summary & Next Steps

### What You Learned

✅ AI agents work through **tool-calling loops**
✅ Claude Code has a **layered architecture** (UI → Orchestration → Tools → Services)
✅ The **QueryEngine** is the core orchestrator
✅ **Tools** are the agent's capabilities
✅ **Permissions** control dangerous operations
✅ **Context** gives the agent environmental awareness

### Key Takeaways

1. **Tools are everything** - An agent is only as good as its tools
2. **The loop is fundamental** - Input → Reasoning → Action → Result → Repeat
3. **Streaming matters** - Real-time updates create better UX
4. **Safety first** - Permission systems prevent disasters
5. **Context is king** - Agents need rich environmental information

### Self-Check Questions

Before moving to Part 2, you should be able to answer:

- [ ] What is the tool-calling loop?
- [ ] What does the QueryEngine do?
- [ ] How do permissions work?
- [ ] What's the difference between a tool and a command?
- [ ] Where is the entry point of the application?
- [ ] How does context flow into the LLM?

### Next: Part 2 - Tool System Deep-Dive

In the next part, you'll learn:
- How to define tool schemas with Zod
- Building your first custom tool
- Advanced permission patterns
- Tool execution lifecycle
- Error handling strategies

**Continue to** → [Part 2: Tool System Deep-Dive](./02-tool-system.md)

---

*Last updated: March 31, 2026*
