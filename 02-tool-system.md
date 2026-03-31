# Part 2: Tool System Deep-Dive

> Master the foundation of AI agents: tools and their execution

**Duration**: 2 weeks
**Prerequisites**: Part 1 - Fundamentals

---

## Table of Contents

1. [What Are Tools?](#what-are-tools)
2. [Tool Anatomy](#tool-anatomy)
3. [Schema Definition with Zod](#schema-definition-with-zod)
4. [Permission System](#permission-system)
5. [Tool Execution Lifecycle](#tool-execution-lifecycle)
6. [Building Your First Tool](#building-your-first-tool)
7. [Advanced Tool Patterns](#advanced-tool-patterns)
8. [Error Handling](#error-handling)
9. [Hands-On Exercises](#hands-on-exercises)

---

## What Are Tools?

### Conceptual Definition

**Tools are the capabilities of an AI agent**. They are functions that:

1. **LLMs can discover** (via descriptions in system prompts)
2. **LLMs can invoke** (via tool-calling API feature)
3. **Execute actions** in the real world
4. **Return results** that LLMs can reason about

### The Tool-Calling Mechanism

```
┌─────────────────────────────────────────────────────────────┐
│             HOW TOOL CALLING WORKS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. System Prompt includes tool definitions:                │
│     ```                                                     │
│     Available tools:                                        │
│     - Read(file_path: string): Read a file                  │
│     - Bash(command: string): Run shell command              │
│     ```                                                     │
│                                                             │
│  2. User: "Show me app.ts"                                  │
│                                                             │
│  3. Claude API request:                                     │
│     POST /v1/messages                                       │
│     {                                                       │
│       "model": "claude-sonnet-4-5",                         │
│       "tools": [                                            │
│         {                                                   │
│           "name": "Read",                                   │
│           "description": "Read a file...",                  │
│           "input_schema": {                                 │
│             "type": "object",                               │
│             "properties": {                                 │
│               "file_path": {"type": "string"}               │
│             }                                               │
│           }                                                 │
│         }                                                   │
│       ],                                                    │
│       "messages": [{"role": "user", "content": "..."}]      │
│     }                                                       │
│                                                             │
│  4. Claude responds with tool_use:                          │
│     {                                                       │
│       "role": "assistant",                                  │
│       "content": [                                          │
│         {                                                   │
│           "type": "tool_use",                               │
│           "id": "toolu_abc123",                             │
│           "name": "Read",                                   │
│           "input": {"file_path": "app.ts"}                  │
│         }                                                   │
│       ]                                                     │
│     }                                                       │
│                                                             │
│  5. Agent executes tool → Returns result                    │
│                                                             │
│  6. Next API request includes result:                       │
│     {                                                       │
│       "role": "user",                                       │
│       "content": [                                          │
│         {                                                   │
│           "type": "tool_result",                            │
│           "tool_use_id": "toolu_abc123",                    │
│           "content": "const app = ..."                      │
│         }                                                   │
│       ]                                                     │
│     }                                                       │
│                                                             │
│  7. Claude uses result to respond to user                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Why Tools Matter

| Without Tools | With Tools |
|---------------|------------|
| "I think there's a bug in app.ts" | *Reads app.ts* "The bug is on line 42" |
| "You should run npm install" | *Runs npm install* "Installed 23 packages" |
| "The tests might fail" | *Runs tests* "3 tests failed, here's the output" |

**Tools transform LLMs from advisors into executors.**

---

## Tool Anatomy

### The Tool Interface

Every tool in Claude Code implements this interface:

**Location**: `src/Tool.ts:109-200`

```typescript
export type Tool<Input = unknown, Output = unknown> = {
  // === METADATA ===
  name: string                    // Tool identifier (e.g., "Bash", "Read")
  description: () => Promise<string>  // What the tool does
  searchHint?: string             // Used for deferred tool discovery

  // === SCHEMA ===
  inputSchema: ZodSchema          // Input validation schema
  outputSchema?: ZodSchema        // Output structure (optional)

  // === PERMISSION ===
  checkPermissions: (input) => Promise<PermissionResult>
  requiresUserInteraction?: () => boolean
  isReadOnly?: () => boolean

  // === EXECUTION ===
  execute: (input, context) => Promise<Output>

  // === UI ===
  renderToolUseMessage?: (input) => ReactNode
  renderToolResultMessage?: (output) => ReactNode
  userFacingName?: () => string

  // === CONFIGURATION ===
  isEnabled?: () => boolean
  isConcurrencySafe?: () => boolean
  maxResultSizeChars?: number
}
```

### Real Example: AskUserQuestionTool

**Location**: `src/tools/AskUserQuestionTool/AskUserQuestionTool.tsx:109-200`

```typescript
export const AskUserQuestionTool: Tool = buildTool({
  // Metadata
  name: "AskUserQuestion",
  searchHint: "prompt the user with a multiple-choice question",
  maxResultSizeChars: 100_000,

  // Description (shown to Claude)
  async description() {
    return DESCRIPTION  // "Use this tool when you need to ask..."
  },

  // Schema
  get inputSchema() {
    return z.strictObject({
      questions: z.array(questionSchema()).min(1).max(4),
      answers: z.record(z.string(), z.string()).optional()
    })
  },

  // Permission
  async checkPermissions(input) {
    return {
      behavior: 'ask',          // Ask user for permission
      message: 'Answer questions?',
      updatedInput: input
    }
  },

  // Execution
  async execute(input, context) {
    // Shows dialog to user
    // Returns user's answers
    return {
      questions: input.questions,
      answers: /* user answers */,
      annotations: /* metadata */
    }
  },

  // UI rendering
  renderToolUseMessage() {
    return null  // Don't show "Using tool..." message
  },

  renderToolResultMessage({ answers }) {
    return <AskUserQuestionResultMessage answers={answers} />
  },

  // Configuration
  requiresUserInteraction() {
    return true  // This tool needs user at keyboard
  },

  isReadOnly() {
    return true  // Doesn't modify files/system
  }
})
```

### Tool File Structure

Most tools follow this pattern:

```
src/tools/MyTool/
├── MyTool.tsx              # Main tool definition
├── prompt.ts               # Description, usage guidance
├── schema.ts               # Zod schemas (if complex)
├── executor.ts             # Execution logic
├── permissions.ts          # Permission rules
├── UI.tsx                  # React components for display
└── utils.ts                # Helper functions
```

**Example - BashTool structure**:

```
src/tools/BashTool/
├── BashTool.tsx                    # Main tool
├── prompt.ts                       # Tool description
├── bashPermissions.ts              # Permission logic
├── bashSecurity.ts                 # Security checks
├── commandSemantics.ts             # Command interpretation
├── sedEditParser.ts                # Special sed handling
├── UI.tsx                          # UI components
└── utils.ts                        # Helpers
```

---

## Schema Definition with Zod

### Why Zod?

**Zod v4** provides:
1. **Type safety**: TypeScript types derived from schemas
2. **Runtime validation**: Catches invalid inputs before execution
3. **JSON Schema generation**: Converted to JSON for Claude API
4. **Descriptive errors**: Clear error messages for LLM

### Basic Schema Pattern

```typescript
import { z } from 'zod/v4'
import { lazySchema } from '../../utils/lazySchema.js'

// Use lazySchema() to avoid circular dependencies
const inputSchema = lazySchema(() =>
  z.strictObject({
    file_path: z.string().describe(
      'The absolute path to the file to read'
    ),

    offset: z.number().optional().describe(
      'Line number to start reading from'
    ),

    limit: z.number().optional().describe(
      'Number of lines to read'
    )
  })
)

type Input = z.infer<ReturnType<typeof inputSchema>>
```

**Key patterns**:
- `lazySchema()` → Delays schema creation to avoid import cycles
- `.strictObject()` → Disallows extra properties
- `.describe()` → Provides hints to Claude
- `z.infer<>` → Extracts TypeScript type

### AskUserQuestionTool Schema

**Location**: `src/tools/AskUserQuestionTool/AskUserQuestionTool.tsx:14-67`

```typescript
// Option schema (one choice in a question)
const questionOptionSchema = lazySchema(() =>
  z.object({
    label: z.string().describe(
      'The display text for this option (1-5 words)'
    ),

    description: z.string().describe(
      'Explanation of what this option means'
    ),

    preview: z.string().optional().describe(
      'Optional preview content (code, mockup, etc.)'
    )
  })
)

// Question schema
const questionSchema = lazySchema(() =>
  z.object({
    question: z.string().describe(
      'The complete question to ask the user'
    ),

    header: z.string().describe(
      'Very short label (max 12 chars). Examples: "Auth method"'
    ),

    options: z.array(questionOptionSchema())
      .min(2)
      .max(4)
      .describe('2-4 choices for this question'),

    multiSelect: z.boolean().default(false).describe(
      'Allow selecting multiple options'
    )
  })
)

// Full input schema
const inputSchema = lazySchema(() =>
  z.strictObject({
    questions: z.array(questionSchema())
      .min(1)
      .max(4)
      .describe('Questions to ask the user (1-4 questions)'),

    answers: z.record(z.string(), z.string()).optional(),

    metadata: z.object({
      source: z.string().optional()
    }).optional()
  })
  .refine(
    // Custom validation: ensure uniqueness
    (data) => {
      const questions = data.questions.map(q => q.question)
      return questions.length === new Set(questions).size
    },
    { message: 'Question texts must be unique' }
  )
)
```

**Advanced features used**:
- **Nested schemas**: `questionOptionSchema` inside `questionSchema`
- **Array constraints**: `.min(2).max(4)`
- **Defaults**: `.default(false)`
- **Custom refinement**: `.refine()` for uniqueness check

### BashTool Schema

**Location**: `src/tools/BashTool/BashTool.tsx:227-247`

```typescript
const fullInputSchema = lazySchema(() =>
  z.strictObject({
    command: z.string().describe('The command to execute'),

    timeout: semanticNumber(
      z.number().optional()
    ).describe(
      'Optional timeout in milliseconds (max 600000)'
    ),

    description: z.string().optional().describe(
      `Clear, concise description in active voice.

      Examples:
      - ls → "List files in current directory"
      - git status → "Show working tree status"
      - npm install → "Install package dependencies"`
    ),

    run_in_background: semanticBoolean(
      z.boolean().optional()
    ).describe(
      'Set to true to run this command in the background'
    ),

    dangerouslyDisableSandbox: semanticBoolean(
      z.boolean().optional()
    ).describe(
      'Override sandbox mode (dangerous!)'
    )
  })
)
```

**Special patterns**:
- `semanticNumber()`: Wrapper allowing LLM to pass strings that parse to numbers
- `semanticBoolean()`: Wrapper allowing "true"/"false" strings
- **Long descriptions**: Multi-line guidance with examples

### Schema Best Practices

| Do ✅ | Don't ❌ |
|-------|----------|
| Use `.describe()` on every field | Leave fields undescribed |
| Provide examples in descriptions | Use vague descriptions |
| Use `.optional()` for optional fields | Make everything required |
| Use semantic wrappers for flexibility | Be overly strict |
| Add constraints (min, max) | Allow any value |
| Use `.refine()` for complex validation | Try to validate in execute() |

---

## Permission System

### Permission Philosophy

**Claude Code follows a "ask before dangerous" model**:

- ✅ **Safe operations**: Auto-approve (Read, Grep, Glob)
- ⚠️ **Risky operations**: Ask user (Bash, Edit, Write)
- 🔒 **Configurable**: Users can set permission modes

### Permission Result Types

**Location**: `src/types/permissions.ts:40-47`

```typescript
export type PermissionResult =
  // Automatically approve
  | { behavior: 'auto'; updatedInput: Input }

  // Ask user for approval
  | { behavior: 'ask'; message: string; updatedInput: Input }

  // Automatically deny
  | { behavior: 'deny'; message: string }

  // Show custom UI (for complex permission flows)
  | { behavior: 'custom'; component: ReactElement }
```

### Permission Modes

```typescript
type PermissionMode =
  | 'default'              // Ask for dangerous ops
  | 'plan'                 // Ask for ALL ops (planning mode)
  | 'bypassPermissions'    // Auto-approve all (dangerous!)
  | 'auto'                 // Smart auto-approval
```

### Example: FileReadTool (Always Safe)

```typescript
// FileReadTool always auto-approves
async checkPermissions(input) {
  return {
    behavior: 'auto',
    updatedInput: input
  }
}

isReadOnly() {
  return true  // Read-only tools are inherently safe
}
```

### Example: BashTool (Conditional)

**Location**: `src/tools/BashTool/bashPermissions.ts`

```typescript
async checkPermissions(input, context) {
  const { command } = input

  // Check if command is safe
  if (isSafeReadOnlyCommand(command)) {
    return {
      behavior: 'auto',
      updatedInput: input
    }
  }

  // Check sandbox status
  if (shouldUseSandbox(input, context)) {
    // Sandbox mitigates risk
    return {
      behavior: 'ask',
      message: `Run sandboxed: ${command}`,
      updatedInput: input
    }
  }

  // Dangerous command
  return {
    behavior: 'ask',
    message: `Run command: ${command}`,
    updatedInput: input,
    dangerLevel: 'high'
  }
}
```

**Safety checks used**:
1. **Command parsing**: Detect dangerous patterns (rm, dd, etc.)
2. **Sandbox detection**: Use isolated environment when possible
3. **User confirmation**: Always ask for destructive operations

### Example: Custom Permission UI

```typescript
async checkPermissions(input, context) {
  // For complex cases, show custom dialog
  return {
    behavior: 'custom',
    component: (
      <MyCustomPermissionDialog
        input={input}
        onApprove={(modifiedInput) => {...}}
        onDeny={() => {...}}
      />
    )
  }
}
```

---

## Tool Execution Lifecycle

### Complete Lifecycle Diagram

```
┌────────────────────────────────────────────────────────────┐
│              TOOL EXECUTION LIFECYCLE                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. CLAUDE RETURNS TOOL_USE                                │
│     {                                                      │
│       type: "tool_use",                                    │
│       name: "Bash",                                        │
│       input: {command: "npm install"}                      │
│     }                                                      │
│          ↓                                                 │
│  2. TOOL LOOKUP                                            │
│     tools.find(t => t.name === "Bash")                     │
│          ↓                                                 │
│  3. INPUT VALIDATION                                       │
│     tool.inputSchema.parse(input)                          │
│     ├─ Valid → Continue                                    │
│     └─ Invalid → Return error to Claude                    │
│          ↓                                                 │
│  4. VALIDATEINPUT (optional)                               │
│     tool.validateInput(input)                              │
│     ├─ Valid → Continue                                    │
│     └─ Invalid → Return error to Claude                    │
│          ↓                                                 │
│  5. PERMISSION CHECK                                       │
│     permissionResult = tool.checkPermissions(input)        │
│     ├─ auto → Continue                                     │
│     ├─ ask → Show dialog to user                           │
│     │   ├─ User approves → Continue                        │
│     │   └─ User denies → Return denial to Claude           │
│     └─ deny → Return denial to Claude                      │
│          ↓                                                 │
│  6. EXECUTE                                                │
│     result = await tool.execute(input, context)            │
│     ├─ Success → Format result                             │
│     └─ Error → Catch and format error                      │
│          ↓                                                 │
│  7. RENDER RESULT                                          │
│     tool.renderToolResultMessage(result)                   │
│     → Display to user                                      │
│          ↓                                                 │
│  8. RETURN TO CLAUDE                                       │
│     {                                                      │
│       type: "tool_result",                                 │
│       tool_use_id: "toolu_abc123",                         │
│       content: "Installed 23 packages..."                  │
│     }                                                      │
│          ↓                                                 │
│  9. LOOP CONTINUES                                         │
│     Claude reasons about result → May call more tools      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Code Flow in QueryEngine

**Simplified from** `src/QueryEngine.ts`

```typescript
async function executeTool(
  toolUse: ToolUseBlock,
  context: ToolUseContext
) {
  // 1. Find tool
  const tool = tools.find(t => t.name === toolUse.name)
  if (!tool) {
    return errorResult("Tool not found")
  }

  // 2. Validate schema
  try {
    tool.inputSchema.parse(toolUse.input)
  } catch (err) {
    return errorResult(`Invalid input: ${err.message}`)
  }

  // 3. Custom validation
  const validation = await tool.validateInput?.(toolUse.input)
  if (validation?.result === false) {
    return errorResult(validation.message)
  }

  // 4. Check permissions
  const permission = await tool.checkPermissions(
    toolUse.input,
    context
  )

  if (permission.behavior === 'deny') {
    return denialResult(permission.message)
  }

  if (permission.behavior === 'ask') {
    const userApproved = await askUser(permission.message)
    if (!userApproved) {
      return denialResult("User denied")
    }
  }

  // 5. Execute
  try {
    const result = await tool.execute(
      permission.updatedInput,
      context
    )

    // 6. Return result
    return {
      type: "tool_result",
      tool_use_id: toolUse.id,
      content: JSON.stringify(result)
    }
  } catch (err) {
    return errorResult(`Execution failed: ${err.message}`)
  }
}
```

---

## Building Your First Tool

### Exercise: WeatherTool

Let's build a simple tool that fetches weather data.

**Goal**: Create a tool that Claude can use to get weather information.

#### Step 1: Create Tool File

```bash
mkdir -p experiments/tools/WeatherTool
touch experiments/tools/WeatherTool/WeatherTool.tsx
```

#### Step 2: Define Schema

```typescript
// experiments/tools/WeatherTool/WeatherTool.tsx
import { z } from 'zod/v4'
import { buildTool } from '../../../src/Tool.js'

// Input schema
const inputSchema = z.strictObject({
  city: z.string().describe(
    'The city name (e.g., "London", "New York")'
  ),

  units: z.enum(['celsius', 'fahrenheit'])
    .default('celsius')
    .describe('Temperature units')
})

type Input = z.infer<typeof inputSchema>

// Output schema
const outputSchema = z.object({
  city: z.string(),
  temperature: z.number(),
  condition: z.string(),
  humidity: z.number()
})

type Output = z.infer<typeof outputSchema>
```

#### Step 3: Implement Tool

```typescript
export const WeatherTool = buildTool<Input, Output>({
  name: "Weather",

  async description() {
    return "Get current weather for a city. " +
           "Returns temperature, conditions, and humidity."
  },

  inputSchema,
  outputSchema,

  // Permissions: Weather data is safe
  async checkPermissions(input) {
    return {
      behavior: 'auto',
      updatedInput: input
    }
  },

  // Execution
  async execute(input, context) {
    // Mock implementation (replace with real API)
    const weather = await fetchWeather(input.city, input.units)

    return {
      city: input.city,
      temperature: weather.temp,
      condition: weather.condition,
      humidity: weather.humidity
    }
  },

  // UI
  renderToolResultMessage(output) {
    return (
      <Box>
        <Text>Weather in {output.city}:</Text>
        <Text>  Temperature: {output.temperature}°</Text>
        <Text>  Condition: {output.condition}</Text>
        <Text>  Humidity: {output.humidity}%</Text>
      </Box>
    )
  },

  // Configuration
  isReadOnly() {
    return true
  },

  isConcurrencySafe() {
    return true  // Can run in parallel with other tools
  }
})

// Mock weather fetcher
async function fetchWeather(city: string, units: string) {
  // In real implementation, call weather API
  return {
    temp: 72,
    condition: "Sunny",
    humidity: 45
  }
}
```

#### Step 4: Register Tool

```typescript
// In experiments/myAgent.ts
import { WeatherTool } from './tools/WeatherTool/WeatherTool.js'

const tools = [
  ...getTools(),  // Existing tools
  WeatherTool     // Your new tool
]
```

#### Step 5: Test

```typescript
// Test the tool
const result = await WeatherTool.execute(
  { city: "London", units: "celsius" },
  context
)

console.log(result)
// {
//   city: "London",
//   temperature: 72,
//   condition: "Sunny",
//   humidity: 45
// }
```

---

## Advanced Tool Patterns

### 1. Streaming Results

Some tools produce large or incremental output:

```typescript
async execute(input, context) {
  // Set up streaming
  const stream = context.setToolJSX((jsx) => {
    // Update UI in real-time
  })

  // Stream data
  for await (const chunk of dataSource) {
    stream.update(<Progress data={chunk} />)
  }

  return finalResult
}
```

### 2. Background Execution

**BashTool** can run commands in background:

```typescript
// User: "Run long process in background"
execute(input, context) {
  if (input.run_in_background) {
    const task = spawnBackgroundTask(input.command)
    return {
      taskId: task.id,
      message: "Running in background..."
    }
  }
}
```

### 3. File State Caching

Tools can cache file reads for efficiency:

```typescript
async execute(input, context) {
  // Check cache first
  const cached = context.readFileCache.get(input.file_path)
  if (cached && !cached.isStale()) {
    return cached.content
  }

  // Read and cache
  const content = await fs.readFile(input.file_path, 'utf-8')
  context.readFileCache.set(input.file_path, content)

  return content
}
```

### 4. Sub-Agent Spawning

**AgentTool** spawns sub-agents for complex tasks:

```typescript
async execute(input, context) {
  const agent = await spawnAgent({
    type: input.subagent_type,
    prompt: input.prompt,
    tools: selectToolsForAgent(input.subagent_type)
  })

  // Wait for agent to complete
  const result = await agent.run()

  return result
}
```

---

## Error Handling

### Error Types

```typescript
// 1. Validation errors (before execution)
class ValidationError extends Error {
  errorCode: number
}

// 2. Permission denials (user says no)
class PermissionDeniedError extends Error {
  toolName: string
}

// 3. Execution errors (during tool run)
class ToolExecutionError extends Error {
  toolName: string
  originalError: Error
}
```

### Error Handling in Tools

```typescript
async execute(input, context) {
  try {
    // Attempt operation
    const result = await riskyOperation(input)
    return result

  } catch (err) {
    // Format error for Claude
    if (err.code === 'ENOENT') {
      return {
        error: `File not found: ${input.file_path}`,
        suggestion: "Check the path and try again"
      }
    }

    if (err.code === 'EACCES') {
      return {
        error: `Permission denied: ${input.file_path}`,
        suggestion: "Ensure you have read/write access"
      }
    }

    // Generic error
    throw new ToolExecutionError(
      `Failed to execute: ${err.message}`,
      { cause: err }
    )
  }
}
```

### Returning Errors vs Throwing

| Return Error Object | Throw Exception |
|---------------------|-----------------|
| Claude can see error details | Tool execution stops |
| Claude can retry with changes | User sees error message |
| Graceful degradation | Hard failure |
| **Preferred for recoverable errors** | For unrecoverable errors |

**Example - Returning error**:

```typescript
// GOOD: Claude can see this and adjust
return {
  success: false,
  error: "File not found: app.ts",
  suggestion: "Did you mean app.tsx?"
}
```

**Example - Throwing error**:

```typescript
// ONLY for unrecoverable errors
throw new Error("Out of memory")
```

---

## Hands-On Exercises

### Exercise 1: Analyze Existing Tools

Pick 3 tools and answer:

1. What does the tool do?
2. What's its input schema?
3. What permission mode does it use?
4. Is it read-only or mutating?
5. How does it handle errors?

**Recommended tools**:
- `src/tools/FileReadTool/`
- `src/tools/GrepTool/`
- `src/tools/AskUserQuestionTool/`

### Exercise 2: Build a Calculator Tool

Create `CalculatorTool` that:

- Accepts an expression (string)
- Evaluates it safely
- Returns the result

**Requirements**:
- Schema with `expression: string`
- Auto-approve (math is safe)
- Handle divide-by-zero
- Prevent code injection (use safe eval)

### Exercise 3: Build a GitHub Tool

Create `GitHubTool` that:

- Fetches repo info from GitHub API
- Input: `owner` and `repo` name
- Output: stars, forks, description

**Challenge**: Add caching to avoid rate limits

### Exercise 4: Extend BashTool

Study `src/tools/BashTool/` and:

1. Identify safety checks
2. Find sandbox logic
3. Understand permission rules
4. Trace a command execution

### Exercise 5: Permission Scenarios

For each scenario, decide: `auto`, `ask`, or `deny`?

1. Reading a `.env` file
2. Running `ls -la`
3. Running `rm -rf /`
4. Running `git status`
5. Running `curl https://api.example.com`
6. Writing to `/etc/hosts`
7. Reading a public GitHub repo

---

## Summary & Next Steps

### What You Learned

✅ Tools are the agent's capabilities
✅ Schemas define inputs and outputs (with Zod)
✅ Permissions control dangerous operations
✅ Lifecycle: Validate → Permission → Execute → Return
✅ Error handling: Return errors for Claude to handle
✅ Real-world patterns: Streaming, caching, background tasks

### Key Takeaways

1. **Schemas are documentation** - Claude reads `.describe()` annotations
2. **Permissions prevent disasters** - Never auto-approve destructive ops
3. **Return structured errors** - Let Claude retry intelligently
4. **Tools should be atomic** - One clear purpose per tool
5. **UI matters** - Good rendering improves user experience

### Self-Check

Before Part 3, you should be able to:

- [ ] Explain the tool execution lifecycle
- [ ] Write a Zod schema with descriptions
- [ ] Implement permission checks
- [ ] Build a simple tool from scratch
- [ ] Handle errors gracefully
- [ ] Understand when to use `auto` vs `ask` permissions

### Next: Part 3 - Agent Orchestration

In the next part, you'll learn:
- QueryEngine architecture in depth
- The tool-calling loop implementation
- Streaming and real-time updates
- State management across turns
- Context window management
- Retry strategies

**Continue to** → [Part 3: Agent Orchestration](./03-orchestration.md)

---

*Last updated: March 31, 2026*
