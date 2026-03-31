# Quick Reference Guide

> Cheat sheet for AI agent development concepts

---

## Core Concepts

### Tool-Calling Loop

```
User Input → LLM → Tool Call → Execute → Result → LLM → Response
     ↑                                                     │
     └─────────────────────────────────────────────────────┘
                    (Loop until complete)
```

### Tool Structure

```typescript
export const MyTool = buildTool({
  name: "MyTool",
  description: async () => "What the tool does",
  inputSchema: z.object({ /* ... */ }),

  checkPermissions: async (input) => ({
    behavior: 'auto' | 'ask' | 'deny'
  }),

  execute: async (input, context) => {
    // Implementation
    return result
  }
})
```

### QueryEngine Flow

```typescript
async function* query(config: QueryEngineConfig) {
  while (!done) {
    // 1. Call Claude API
    const response = await claude.messages.create({...})

    // 2. Stream response
    for await (const chunk of response) {
      yield chunk
    }

    // 3. Execute tools
    if (hasToolCalls) {
      const results = await executeTools(toolCalls)
      messages.push(results)
    } else {
      done = true
    }
  }
}
```

---

## File Reference

### Essential Files

| File | Purpose | Line Count |
|------|---------|------------|
| `src/main.tsx` | Entry point | ~800 |
| `src/Tool.ts` | Tool types | ~300 |
| `src/QueryEngine.ts` | Orchestration | ~4600 |
| `src/tools.ts` | Tool registry | ~200 |
| `src/context.ts` | System context | ~300 |

### Key Directories

```
src/
├── tools/                  # 40+ tool implementations
├── commands/               # 50+ slash commands
├── components/             # 140+ UI components
├── services/
│   ├── api/               # Claude API client
│   ├── mcp/               # MCP integration
│   └── compact/           # Context compression
├── state/                 # State management
├── coordinator/           # Multi-agent coordination
└── utils/                 # Utilities
```

---

## Common Patterns

### Zod Schema

```typescript
import { z } from 'zod/v4'
import { lazySchema } from './utils/lazySchema.js'

const schema = lazySchema(() =>
  z.strictObject({
    required: z.string().describe('Description for Claude'),
    optional: z.number().optional().describe('Optional field'),
    choices: z.enum(['a', 'b', 'c']),
    array: z.array(z.string()).min(1).max(10),
    nested: z.object({
      field: z.boolean()
    })
  })
)

type Input = z.infer<ReturnType<typeof schema>>
```

### Permission Handling

```typescript
// Auto-approve (safe operations)
async checkPermissions(input) {
  return { behavior: 'auto', updatedInput: input }
}

// Ask user (risky operations)
async checkPermissions(input) {
  return {
    behavior: 'ask',
    message: `Run command: ${input.command}?`,
    updatedInput: input
  }
}

// Deny (dangerous operations)
async checkPermissions(input) {
  return {
    behavior: 'deny',
    message: 'This operation is not allowed'
  }
}
```

### Error Handling

```typescript
async execute(input, context) {
  try {
    const result = await doWork(input)
    return { success: true, result }
  } catch (err) {
    // Return error to Claude (don't throw)
    return {
      success: false,
      error: err.message,
      suggestion: 'Try a different approach'
    }
  }
}
```

### Streaming

```typescript
async execute(input, context) {
  // Set up streaming UI
  context.setToolJSX((jsx) => {
    return <Progress current={current} total={total} />
  })

  // Stream updates
  for (let i = 0; i < total; i++) {
    current = i
    // UI updates automatically
    await doWork(i)
  }

  return finalResult
}
```

---

## API Reference

### QueryEngineConfig

```typescript
type QueryEngineConfig = {
  cwd: string
  tools: Tools
  commands: Command[]
  mcpClients: MCPServerConnection[]
  canUseTool: CanUseToolFn
  getAppState: () => AppState
  setAppState: (f) => void
  initialMessages?: Message[]
  readFileCache: FileStateCache
  customSystemPrompt?: string
  userSpecifiedModel?: string
  maxTurns?: number
  maxBudgetUsd?: number
}
```

### ToolUseContext

```typescript
type ToolUseContext = {
  cwd: string
  readFileCache: FileStateCache
  getAppState: () => AppState
  setAppState: (f) => void
  setToolJSX: SetToolJSXFn
  abortSignal: AbortSignal
}
```

### Message Types

```typescript
type Message =
  | UserMessage
  | AssistantMessage
  | SystemMessage

type UserMessage = {
  role: 'user'
  content: string | ContentBlock[]
}

type AssistantMessage = {
  role: 'assistant'
  content: (TextBlock | ToolUseBlock)[]
}

type ToolUseBlock = {
  type: 'tool_use'
  id: string
  name: string
  input: unknown
}

type ToolResultBlock = {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
}
```

---

## CLI Commands

### Basic Usage

```bash
# Start interactive session
claude-code

# One-off command
claude-code "Fix the bug in app.ts"

# Specify model
claude-code --model claude-opus-4

# Plan mode
claude-code --plan
```

### Slash Commands

```
/commit         Create git commit
/config         Open settings
/mcp            Manage MCP servers
/tasks          View tasks
/skills         List skills
/cost           Show usage cost
/resume         Resume previous session
```

---

## Environment Variables

```bash
# API Key
export ANTHROPIC_API_KEY="sk-ant-..."

# Debug mode
export CLAUDE_CODE_DEBUG=true

# Disable background tasks
export CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=true

# Custom config directory
export CLAUDE_CODE_CONFIG_DIR="~/.my-config"
```

---

## Debugging Tips

### Enable Verbose Logging

```typescript
const config: QueryEngineConfig = {
  ...otherConfig,
  verbose: true  // Log everything
}
```

### Inspect Tool Calls

```typescript
// Add logging in tool
async execute(input, context) {
  console.log('[Tool Input]', JSON.stringify(input, null, 2))

  const result = await doWork(input)

  console.log('[Tool Result]', JSON.stringify(result, null, 2))
  return result
}
```

### Trace Message Flow

```typescript
// Log messages at each turn
for (let i = 0; i < messages.length; i++) {
  console.log(`[Turn ${i}]`, messages[i].role)
  console.log(messages[i].content)
}
```

---

## Performance Checklist

- [ ] Use lazy loading for heavy modules
- [ ] Parallelize independent tool calls
- [ ] Cache file reads
- [ ] Limit tool result sizes
- [ ] Compress context when needed
- [ ] Use streaming for real-time feedback
- [ ] Prefetch expensive operations

---

## Security Checklist

- [ ] Validate all tool inputs
- [ ] Never auto-approve destructive operations
- [ ] Sandbox dangerous commands
- [ ] Check for command injection
- [ ] Validate file paths (no ../../../etc/passwd)
- [ ] Rate limit API calls
- [ ] Sanitize user inputs
- [ ] Don't log secrets

---

## Testing Checklist

- [ ] Test tool schemas validate correctly
- [ ] Test permission logic
- [ ] Test error handling
- [ ] Test edge cases (empty input, large input)
- [ ] Test concurrent execution
- [ ] Test cancellation
- [ ] Mock external dependencies
- [ ] Test streaming behavior

---

## Resources

### Documentation
- [Anthropic API Docs](https://docs.anthropic.com)
- [Tool Use Guide](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
- [MCP Documentation](https://modelcontextprotocol.io)

### Tools & Libraries
- [Bun Runtime](https://bun.sh)
- [Zod Schema Validation](https://zod.dev)
- [Ink (React for CLIs)](https://github.com/vadimdemedes/ink)

### Community
- [Claude Code GitHub](https://github.com/anthropics/claude-code)
- [MCP Servers Registry](https://github.com/modelcontextprotocol/servers)

---

*Last updated: March 31, 2026*
