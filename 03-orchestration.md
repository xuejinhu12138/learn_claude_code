# Part 3: Agent Orchestration

> Master the QueryEngine and the tool-calling loop

**Duration**: 2 weeks
**Prerequisites**: Parts 1-2

---

## Table of Contents

1. [The QueryEngine](#the-queryengine)
2. [The Tool-Calling Loop](#the-tool-calling-loop)
3. [Streaming Architecture](#streaming-architecture)
4. [State Management](#state-management)
5. [Context Window Management](#context-window-management)
6. [Error Handling & Retries](#error-handling--retries)
7. [Performance Optimization](#performance-optimization)
8. [Hands-On Exercises](#hands-on-exercises)

---

## The QueryEngine

### What is the QueryEngine?

The **QueryEngine** is the **brain of the agent**. It:

1. **Orchestrates** the conversation with Claude API
2. **Manages** the tool-calling loop
3. **Handles** streaming responses
4. **Tracks** conversation state and token usage
5. **Implements** retry logic and error recovery

**Location**: `src/QueryEngine.ts` (~46,000 lines!)

### QueryEngine Configuration

**From** `src/QueryEngine.ts:130-150`

```typescript
export type QueryEngineConfig = {
  // Environment
  cwd: string                          // Working directory

  // Capabilities
  tools: Tools                         // Available tools
  commands: Command[]                  // Slash commands
  mcpClients: MCPServerConnection[]    // MCP servers
  agents: AgentDefinition[]            // Sub-agent definitions

  // Permission & State
  canUseTool: CanUseToolFn            // Permission callback
  getAppState: () => AppState          // State getter
  setAppState: (f) => void             // State setter

  // Data
  initialMessages?: Message[]          // Conversation history
  readFileCache: FileStateCache        // File read cache

  // Configuration
  customSystemPrompt?: string          // Custom instructions
  appendSystemPrompt?: string          // Additional instructions
  userSpecifiedModel?: string          // Model override
  thinkingConfig?: ThinkingConfig      // Extended thinking

  // Limits
  maxTurns?: number                    // Iteration limit
  maxBudgetUsd?: number               // Cost limit
  taskBudget?: { total: number }       // Token budget

  // Output
  jsonSchema?: Record<string, unknown> // Structured output schema
  verbose?: boolean                    // Debug logging
}
```

### High-Level Flow

```
User Input
    ↓
QueryEngine.query(config)
    ↓
┌──────────────────────────┐
│   Prepare Context        │
│   - System prompt        │
│   - Tool definitions     │
│   - Message history      │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│   Main Loop              │
│   ┌─────────────────┐    │
│   │ Call Claude API │    │
│   └────────┬────────┘    │
│            ↓             │
│   ┌─────────────────┐    │
│   │ Stream Response │    │
│   └────────┬────────┘    │
│            ↓             │
│   ┌─────────────────┐    │
│   │ Tool calls?     │    │
│   └────────┬────────┘    │
│            ├─ No → Done  │
│            └─ Yes ↓      │
│   ┌─────────────────┐    │
│   │ Execute Tools   │    │
│   └────────┬────────┘    │
│            ↓             │
│   └────────┘ (loop)      │
└──────────────────────────┘
           ↓
    Return Results
```

---

## The Tool-Calling Loop

### Detailed Loop Implementation

**Conceptual code** (simplified from actual QueryEngine):

```typescript
async function* query(config: QueryEngineConfig) {
  // 1. PREPARE CONTEXT
  const systemPrompt = await fetchSystemPromptParts({
    tools: config.tools,
    cwd: config.cwd,
    gitStatus: await getGitStatus(),
    // ... more context
  })

  let messages = [...config.initialMessages || []]
  let turnCount = 0
  let totalCost = 0

  // 2. MAIN LOOP
  while (true) {
    turnCount++

    // Check limits
    if (turnCount > config.maxTurns) {
      throw new Error("Max turns exceeded")
    }
    if (totalCost > config.maxBudgetUsd) {
      throw new Error("Budget exceeded")
    }

    // 3. CALL CLAUDE API
    const response = await claudeAPI.messages.create({
      model: config.userSpecifiedModel || "claude-sonnet-4-5",
      system: systemPrompt,
      messages: messages,
      tools: config.tools.map(toToolDefinition),
      max_tokens: 8192,
      stream: true,  // Enable streaming
      thinking: config.thinkingConfig
    })

    // 4. STREAM RESPONSE
    let assistantMessage = []
    let toolCalls = []

    for await (const chunk of response) {
      if (chunk.type === 'content_block_start') {
        if (chunk.content_block.type === 'tool_use') {
          // Tool call starting
          toolCalls.push(chunk.content_block)
        }
      }

      if (chunk.type === 'content_block_delta') {
        if (chunk.delta.type === 'text_delta') {
          // Text chunk
          yield chunk.delta.text
          assistantMessage.push({
            type: 'text',
            text: chunk.delta.text
          })
        }

        if (chunk.delta.type === 'tool_use_delta') {
          // Tool input accumulating
          const toolCall = toolCalls[toolCalls.length - 1]
          toolCall.input += chunk.delta.input
        }
      }

      if (chunk.type === 'message_stop') {
        // Response complete
        break
      }
    }

    // Track usage
    totalCost += calculateCost(response.usage)

    // Add assistant message to history
    messages.push({
      role: 'assistant',
      content: assistantMessage
    })

    // 5. EXECUTE TOOLS
    if (toolCalls.length === 0) {
      // No more tool calls - done!
      break
    }

    const toolResults = []

    for (const toolCall of toolCalls) {
      // Execute each tool
      const result = await executeTool(toolCall, config)
      toolResults.push(result)

      // Stream result to UI
      yield { type: 'tool_result', result }
    }

    // Add tool results to history
    messages.push({
      role: 'user',
      content: toolResults
    })

    // Loop continues with updated messages
  }

  // 6. RETURN FINAL STATE
  return {
    messages,
    turnCount,
    totalCost,
    usage: getUsageStats()
  }
}
```

### Turn-by-Turn Example

**User**: "Fix the bug in app.ts"

**Turn 1**:
```
→ API: {
    messages: [{role: "user", content: "Fix the bug in app.ts"}]
  }

← API: {
    content: [
      {type: "text", text: "I'll read the file first to see the code."},
      {type: "tool_use", name: "Read", input: {file_path: "app.ts"}}
    ]
  }

Execute: Read tool
Result: "const app = ...\n  console.log(x)  // x is undefined!\n..."

messages = [
  {role: "user", content: "Fix the bug in app.ts"},
  {role: "assistant", content: [text, tool_use]},
  {role: "user", content: [{type: "tool_result", content: "const app..."}]}
]
```

**Turn 2**:
```
→ API: {
    messages: [...previous messages...]
  }

← API: {
    content: [
      {type: "text", text: "I see the bug on line 5. x is undefined. I'll fix it."},
      {type: "tool_use", name: "Edit", input: {
        file_path: "app.ts",
        old_string: "console.log(x)",
        new_string: "const x = 42\n  console.log(x)"
      }}
    ]
  }

Execute: Edit tool
Result: "Success"

messages = [
  ...previous...,
  {role: "assistant", content: [text, tool_use]},
  {role: "user", content: [{type: "tool_result", content: "Success"}]}
]
```

**Turn 3**:
```
→ API: {
    messages: [...previous messages...]
  }

← API: {
    content: [
      {type: "text", text: "Fixed! The bug was that x was undefined. I defined it as 42."}
    ]
  }

No tool calls → DONE
```

**Total**: 3 API calls, 2 tool executions, fixed bug!

---

## Streaming Architecture

### Why Streaming?

| Without Streaming | With Streaming |
|-------------------|----------------|
| Wait 10s → See entire response | See response word-by-word in real-time |
| No progress feedback | See thinking process |
| Poor UX for long tasks | Engaging UX |
| Can't cancel mid-response | Can cancel anytime |

### Streaming Implementation

Claude Code uses **async generators** for streaming:

```typescript
// QueryEngine returns an async generator
async function* query(config): AsyncGenerator<QueryEvent> {
  for await (const chunk of apiResponse) {
    // Yield each chunk immediately
    yield {
      type: 'text',
      content: chunk.delta.text
    }
  }
}

// Consumer iterates over stream
for await (const event of query(config)) {
  if (event.type === 'text') {
    displayToUser(event.content)  // Show immediately!
  }
}
```

### Event Types

```typescript
type QueryEvent =
  // Text chunks from Claude
  | { type: 'text'; content: string }

  // Tool execution started
  | { type: 'tool_use'; tool: string; input: unknown }

  // Tool execution progress
  | { type: 'tool_progress'; tool: string; progress: ToolProgress }

  // Tool execution completed
  | { type: 'tool_result'; tool: string; result: unknown }

  // Thinking content (extended thinking mode)
  | { type: 'thinking'; content: string }

  // Usage stats
  | { type: 'usage'; tokens: Usage }
```

### Real-Time Updates

```typescript
// In UI component
const [output, setOutput] = useState("")

for await (const event of queryEngine.query(config)) {
  switch (event.type) {
    case 'text':
      setOutput(prev => prev + event.content)
      break

    case 'tool_use':
      showToolSpinner(event.tool)
      break

    case 'tool_result':
      hideToolSpinner(event.tool)
      showToolResult(event.result)
      break
  }
}
```

---

## State Management

### Conversation State

The QueryEngine maintains:

```typescript
type ConversationState = {
  // Message history
  messages: Message[]

  // Tool execution state
  activeTool: string | null
  completedTools: string[]

  // Usage tracking
  totalTokens: number
  totalCost: number

  // File state cache
  fileCache: Map<string, FileContent>

  // Permission state
  deniedTools: Set<string>
  approvedPatterns: PermissionPattern[]
}
```

### AppState (Global State)

**Location**: `src/state/AppState.tsx`

```typescript
type AppState = {
  // Session
  sessionId: string
  conversationHistory: Message[]

  // Context
  workingDirectory: string
  gitStatus: GitStatus

  // Configuration
  permissionMode: PermissionMode
  model: string

  // UI state
  isLoading: boolean
  activeSpinners: Set<string>

  // MCP connections
  mcpClients: MCPServerConnection[]

  // Tasks (background)
  backgroundTasks: Task[]
}
```

### State Updates

```typescript
// Reading state
const currentState = getAppState()

// Updating state
setAppState(prev => ({
  ...prev,
  isLoading: true,
  conversationHistory: [
    ...prev.conversationHistory,
    newMessage
  ]
}))
```

### File State Cache

**Purpose**: Avoid re-reading files

```typescript
type FileStateCache = {
  get(path: string): CachedFile | undefined
  set(path: string, content: string): void
  invalidate(path: string): void
  clear(): void
}

// Usage in tools
async execute(input, context) {
  // Check cache
  const cached = context.readFileCache.get(input.file_path)
  if (cached && !cached.isModified()) {
    return cached.content
  }

  // Read and cache
  const content = await fs.readFile(input.file_path, 'utf-8')
  context.readFileCache.set(input.file_path, content)

  return content
}
```

---

## Context Window Management

### The Context Window Problem

```
Claude API has limits:
- Input tokens: ~200K (Sonnet 4.5)
- Output tokens: ~8K

Problem: Long conversations exceed limits!

Solution: Context compression
```

### Compression Strategies

#### 1. **Snip Compaction** (History Snip)

**Idea**: Remove middle turns, keep start and end

```
Before:
[Turn 1] User: "Show me config.ts"
[Turn 2] Assistant: [reads file]
[Turn 3] User: "Now show auth.ts"
[Turn 4] Assistant: [reads file]
[Turn 5] User: "Show utils.ts"
[Turn 6] Assistant: [reads file]
[Turn 7] User: "Update config.ts"

After compression:
[Turn 1] User: "Show me config.ts"
[Turn 2] Assistant: [reads file]
[...snipped 3 turns...]
[Turn 7] User: "Update config.ts"
```

#### 2. **Summarization**

**Idea**: Summarize old turns with LLM

```
Before (5000 tokens):
[Long conversation about debugging...]

After (500 tokens):
[Summary: User was debugging auth flow.
 Found issue in token validation.
 Fixed by updating middleware.]
```

#### 3. **Tool Result Truncation**

**Idea**: Truncate large tool outputs

```
Before:
Tool result: [50,000 lines of npm install output]

After:
Tool result: [First 100 lines...]
[... 49,800 lines truncated ...]
[Last 100 lines...]
```

### Implementation

**Location**: `src/services/compact/`

```typescript
// Compact conversation when needed
async function compactIfNeeded(
  messages: Message[],
  config: CompactConfig
) {
  const tokenCount = estimateTokens(messages)

  if (tokenCount > config.maxTokens * 0.8) {
    // 80% full - time to compact!
    const compacted = await compactMessages(messages, {
      strategy: 'snip',
      targetTokens: config.maxTokens * 0.5  // Compress to 50%
    })

    return compacted
  }

  return messages
}
```

---

## Error Handling & Retries

### Error Categories

```typescript
type APIError =
  // Transient errors (retry)
  | 'rate_limit'
  | 'timeout'
  | 'network_error'

  // Permanent errors (don't retry)
  | 'invalid_api_key'
  | 'model_not_found'
  | 'invalid_request'

  // Overload errors (retry with backoff)
  | 'overloaded'
  | 'server_error'
```

### Retry Strategy

**Location**: `src/services/api/errors.ts`

```typescript
async function queryWithRetries(
  request: APIRequest,
  config: RetryConfig
) {
  let attempt = 0
  const maxAttempts = 3

  while (attempt < maxAttempts) {
    try {
      return await claudeAPI.messages.create(request)

    } catch (err) {
      const category = categorizeError(err)

      if (category === 'permanent') {
        // Don't retry permanent errors
        throw err
      }

      if (category === 'rate_limit') {
        // Wait for rate limit reset
        const retryAfter = err.headers['retry-after']
        await sleep(retryAfter * 1000)
        attempt++
        continue
      }

      if (category === 'overloaded') {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000
        await sleep(delay)
        attempt++
        continue
      }

      // Unknown error - rethrow
      throw err
    }
  }

  throw new Error("Max retries exceeded")
}
```

### Graceful Degradation

```typescript
// If a tool fails, inform Claude and continue
try {
  const result = await tool.execute(input, context)
  return successResult(result)

} catch (err) {
  // Don't crash - return error to Claude
  return {
    type: 'tool_result',
    is_error: true,
    content: `Tool failed: ${err.message}\n` +
             `Suggestion: Try a different approach`
  }
}
```

Claude sees the error and can:
- Try a different tool
- Adjust parameters
- Ask user for help
- Give up gracefully

---

## Performance Optimization

### 1. Parallel Tool Execution

When tools don't depend on each other:

```typescript
// Sequential (slow)
const result1 = await executeTool(tool1)
const result2 = await executeTool(tool2)
const result3 = await executeTool(tool3)
// Total: time1 + time2 + time3

// Parallel (fast!)
const [result1, result2, result3] = await Promise.all([
  executeTool(tool1),
  executeTool(tool2),
  executeTool(tool3)
])
// Total: max(time1, time2, time3)
```

Claude Code detects this automatically when Claude calls multiple tools.

### 2. Lazy Loading

Heavy modules load only when needed:

```typescript
// Don't load at startup
const heavyTool = () =>
  import('./tools/HeavyTool').then(m => m.HeavyTool)

// Load when first used
if (needHeavyTool) {
  const tool = await heavyTool()
  return tool.execute(...)
}
```

### 3. Prefetching

**From** `src/main.tsx:1-20`

```typescript
// Fire these BEFORE heavy imports
startMdmRawRead()          // Parallel subprocess
startKeychainPrefetch()    // Parallel keychain read

// Heavy imports happen while above run
import { largeModule } from './large.js'

// Result: 65ms faster startup!
```

### 4. Request Coalescing

```typescript
// Multiple tools reading same file
const cache = new Map()

async function readFile(path: string) {
  // Return in-flight promise if already reading
  if (cache.has(path)) {
    return cache.get(path)
  }

  // Start read
  const promise = fs.readFile(path, 'utf-8')
  cache.set(path, promise)

  const result = await promise
  cache.delete(path)

  return result
}
```

---

## Hands-On Exercises

### Exercise 1: Trace a Query

Start a conversation and trace it through the QueryEngine:

1. Set `verbose: true` in config
2. Watch console logs
3. Identify:
   - When API is called
   - What tools are invoked
   - How messages accumulate
   - When loop terminates

### Exercise 2: Implement a Simple Loop

Build your own minimal tool-calling loop:

```typescript
async function simpleLoop(userMessage: string) {
  let messages = [{ role: 'user', content: userMessage }]

  while (true) {
    // Your code here:
    // 1. Call Claude API
    // 2. Check for tool calls
    // 3. Execute tools
    // 4. Add results to messages
    // 5. Break if no more tools
  }
}
```

### Exercise 3: Add Streaming

Modify your loop to stream responses:

```typescript
async function* streamingLoop(userMessage: string) {
  // Yield each chunk as it arrives
  for await (const chunk of response) {
    yield chunk
  }
}

// Use it
for await (const chunk of streamingLoop("Hello")) {
  process.stdout.write(chunk)
}
```

### Exercise 4: Implement Retry Logic

Add retry logic to your API calls:

```typescript
async function callWithRetry(request, maxRetries = 3) {
  // Implement:
  // - Try up to maxRetries times
  // - Exponential backoff
  // - Only retry transient errors
}
```

### Exercise 5: Build a Context Compressor

Implement a simple message compressor:

```typescript
function compressMessages(
  messages: Message[],
  targetTokens: number
): Message[] {
  // Strategy: Remove middle messages
  // Keep first 2 and last 2
}
```

---

## Summary & Next Steps

### What You Learned

✅ QueryEngine orchestrates the agent loop
✅ Streaming provides real-time feedback
✅ State management tracks conversation and execution
✅ Context compression prevents token limit issues
✅ Retry logic handles transient failures
✅ Performance optimizations improve UX

### Key Takeaways

1. **The loop is simple** - Call API → Execute tools → Repeat
2. **Streaming is essential** - Real-time updates engage users
3. **State must be managed** - Track messages, cache, permissions
4. **Errors happen** - Graceful degradation > crashing
5. **Performance matters** - Parallel execution, lazy loading, prefetch

### Self-Check

Before Part 4, you should be able to:

- [ ] Explain the tool-calling loop
- [ ] Implement a basic query loop
- [ ] Add streaming to responses
- [ ] Handle API errors gracefully
- [ ] Manage conversation state
- [ ] Optimize for performance

### Next: Part 4 - Advanced Patterns

In the next part, you'll learn:
- Multi-agent coordination
- Sub-agent spawning and management
- Context compression strategies
- MCP (Model Context Protocol) integration
- Plugin architecture
- Memory systems and persistence

**Continue to** → [Part 4: Advanced Patterns](./04-advanced-patterns.md)

---

*Last updated: March 31, 2026*
