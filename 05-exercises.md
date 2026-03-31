# Part 5: Practical Exercises

> Apply your knowledge to build real AI agent systems

**Duration**: 2+ weeks
**Prerequisites**: Parts 1-4

---

## Table of Contents

1. [Exercise Structure](#exercise-structure)
2. [Beginner Projects](#beginner-projects)
3. [Intermediate Projects](#intermediate-projects)
4. [Advanced Projects](#advanced-projects)
5. [Capstone Project](#capstone-project)
6. [Best Practices](#best-practices)
7. [Troubleshooting Guide](#troubleshooting-guide)

---

## Exercise Structure

### How to Approach Exercises

Each exercise follows this format:

1. **Objective**: What you'll build
2. **Concepts**: What you'll practice
3. **Requirements**: Functional requirements
4. **Starter Code**: Templates to begin with
5. **Hints**: Guidance when stuck
6. **Solution**: Reference implementation (try without first!)
7. **Extensions**: Ideas to go further

### Setup

```bash
# Create exercises directory
mkdir -p ~/ai-agent-exercises
cd ~/ai-agent-exercises

# Copy Claude Code source (for reference)
cp -r /Users/ahmedkhaled/claude-code ./reference

# Create your workspace
mkdir beginner intermediate advanced capstone
```

---

## Beginner Projects

### Project 1: Simple Calculator Agent

**Objective**: Build an agent that can perform calculations

**Concepts**:
- Basic tool definition
- Schema validation
- Input/output handling
- Safe execution

**Requirements**:
1. Tool accepts mathematical expressions
2. Safely evaluates expressions
3. Returns results
4. Handles errors (division by zero, invalid syntax)

**Starter Code**:

```typescript
// exercises/beginner/01-calculator/CalculatorTool.ts
import { z } from 'zod/v4'
import { buildTool } from '../../../reference/src/Tool.js'

const inputSchema = z.strictObject({
  expression: z.string().describe('Math expression to evaluate (e.g., "2 + 2")')
})

export const CalculatorTool = buildTool({
  name: "Calculate",

  async description() {
    return "Evaluate a mathematical expression and return the result"
  },

  inputSchema,

  async checkPermissions(input) {
    // TODO: Implement permission check
  },

  async execute(input, context) {
    // TODO: Implement safe evaluation
  }
})
```

**Hints**:
- Use a library like `mathjs` for safe evaluation
- Catch errors and return structured error messages
- Test with: `2 + 2`, `10 / 0`, `sqrt(16)`, `invalid`

**Extensions**:
- Add support for variables (`x = 5; x + 10`)
- Add unit conversions (`10 km to miles`)
- Add history of calculations

---

### Project 2: File Search Tool

**Objective**: Build a tool that searches file contents

**Concepts**:
- File system operations
- Pattern matching
- Result formatting
- Performance optimization

**Requirements**:
1. Search for text in files
2. Support regex patterns
3. Return matching files and line numbers
4. Handle large directories efficiently

**Starter Code**:

```typescript
// exercises/beginner/02-file-search/FileSearchTool.ts
import { z } from 'zod/v4'

const inputSchema = z.strictObject({
  pattern: z.string().describe('Search pattern (regex supported)'),
  directory: z.string().describe('Directory to search in'),
  filePattern: z.string().optional().describe('File pattern (e.g., "*.ts")')
})

export const FileSearchTool = buildTool({
  name: "FileSearch",

  async execute(input, context) {
    // TODO: Implement file search
    // - Walk directory tree
    // - Match file patterns
    // - Search file contents
    // - Return results
  }
})
```

**Hints**:
- Use `fs.readdir` with `recursive: true`
- Use `minimatch` for file pattern matching
- Read files line-by-line for efficiency
- Limit results to top 100 matches

**Extensions**:
- Add case-insensitive search
- Add context lines (show N lines before/after match)
- Add exclude patterns
- Add search caching

---

### Project 3: Todo Manager Agent

**Objective**: Build an agent that manages a todo list

**Concepts**:
- State persistence
- CRUD operations
- Data validation
- User interaction

**Requirements**:
1. Add todo items
2. List todos
3. Mark todos as complete
4. Delete todos
5. Persist to disk

**Starter Code**:

```typescript
// exercises/beginner/03-todo-manager/TodoTool.ts
type Todo = {
  id: string
  text: string
  completed: boolean
  createdAt: number
}

const inputSchema = z.strictObject({
  action: z.enum(['add', 'list', 'complete', 'delete']),
  id: z.string().optional(),
  text: z.string().optional()
})

export const TodoTool = buildTool({
  name: "Todo",

  async execute(input, context) {
    // TODO: Implement todo operations
    // - Load todos from disk
    // - Perform requested action
    // - Save todos to disk
    // - Return result
  }
})
```

**Test Cases**:
```
User: "Add a todo: Buy groceries"
Agent: Uses Todo tool → "Added todo #1"

User: "What's on my todo list?"
Agent: Uses Todo tool → Lists all todos

User: "Mark todo #1 as complete"
Agent: Uses Todo tool → "Marked complete"
```

**Extensions**:
- Add due dates
- Add priority levels
- Add categories/tags
- Add search functionality

---

## Intermediate Projects

### Project 4: Code Review Agent

**Objective**: Build an agent that reviews code changes

**Concepts**:
- Multi-tool coordination
- Git integration
- Pattern recognition
- Structured output

**Requirements**:
1. Read git diff
2. Identify changed files
3. Analyze each change for:
   - Potential bugs
   - Security issues
   - Style violations
   - Performance concerns
4. Generate review report

**Architecture**:

```
CodeReviewAgent
├── Uses: BashTool (git diff)
├── Uses: FileReadTool (read files)
├── Uses: GrepTool (search patterns)
└── Returns: Structured review report
```

**Implementation Steps**:

1. **Get changes**:
```typescript
// Use Bash tool to get diff
const diff = await executeTool({
  name: "Bash",
  input: { command: "git diff --cached" }
})
```

2. **Parse diff**:
```typescript
function parseDiff(diff: string): FileChange[] {
  // TODO: Parse diff into structured format
  // Return: [{file, additions, deletions, hunks}]
}
```

3. **Analyze each file**:
```typescript
async function analyzeFile(file: FileChange) {
  // Check for common issues:
  // - Hardcoded secrets (API keys, passwords)
  // - SQL injection vulnerabilities
  // - XSS vulnerabilities
  // - Console.log statements
  // - TODO comments
  // - Long functions (>50 lines)
}
```

4. **Generate report**:
```typescript
type ReviewReport = {
  summary: string
  filesReviewed: number
  issuesFound: Issue[]
  suggestions: string[]
}
```

**Extensions**:
- Integrate with GitHub API to post comments
- Add severity levels (critical, warning, info)
- Add auto-fix suggestions
- Support multiple languages

---

### Project 5: Documentation Generator

**Objective**: Build an agent that generates documentation from code

**Concepts**:
- Code parsing (AST analysis)
- Template generation
- Multi-file orchestration
- Markdown generation

**Requirements**:
1. Scan project for source files
2. Extract functions, classes, types
3. Generate markdown documentation
4. Create navigation structure

**Example Output**:

```markdown
# API Documentation

## Functions

### `fetchUser(id: string): Promise<User>`

Fetches a user by ID from the database.

**Parameters**:
- `id` (string): User ID

**Returns**: `Promise<User>`

**Example**:
\`\`\`typescript
const user = await fetchUser("123")
console.log(user.name)
\`\`\`

**Throws**:
- `UserNotFoundError` if user doesn't exist
```

**Implementation**:

```typescript
// 1. Find all source files
const files = await glob('src/**/*.ts')

// 2. Parse each file
for (const file of files) {
  const ast = parseTypeScript(file)
  const functions = extractFunctions(ast)
  const classes = extractClasses(ast)

  // 3. Generate docs for each
  docs.push(generateFunctionDocs(functions))
  docs.push(generateClassDocs(classes))
}

// 4. Write to markdown
await writeFile('docs/API.md', docs.join('\n'))
```

**Extensions**:
- Generate examples automatically
- Add type diagrams
- Cross-reference related functions
- Generate changelog from git history

---

### Project 6: Testing Agent

**Objective**: Build an agent that generates tests for code

**Concepts**:
- Code analysis
- Test pattern generation
- Coverage analysis
- Assertion generation

**Requirements**:
1. Read function/class definition
2. Identify edge cases
3. Generate test cases
4. Run tests to verify

**Example**:

```typescript
// Given this function:
function divide(a: number, b: number): number {
  if (b === 0) throw new Error("Division by zero")
  return a / b
}

// Generate tests:
describe('divide', () => {
  it('should divide two numbers', () => {
    expect(divide(10, 2)).toBe(5)
  })

  it('should handle negative numbers', () => {
    expect(divide(-10, 2)).toBe(-5)
  })

  it('should throw on division by zero', () => {
    expect(() => divide(10, 0)).toThrow("Division by zero")
  })

  it('should handle decimals', () => {
    expect(divide(5, 2)).toBe(2.5)
  })
})
```

**Implementation**:

```typescript
async function generateTests(functionCode: string) {
  // 1. Parse function signature
  const signature = parseSignature(functionCode)

  // 2. Identify test cases
  const testCases = [
    {name: 'normal case', inputs: normalInputs},
    {name: 'edge case', inputs: edgeInputs},
    {name: 'error case', inputs: errorInputs}
  ]

  // 3. Generate test code
  return generateTestCode(signature, testCases)
}
```

**Extensions**:
- Add coverage reporting
- Add property-based testing
- Add integration test generation
- Add test for existing bugs

---

## Advanced Projects

### Project 7: Multi-Agent Code Generator

**Objective**: Build a system with specialized sub-agents

**Concepts**:
- Agent coordination
- Parallel execution
- Result aggregation
- Error recovery

**Architecture**:

```
Main Agent: "Build a REST API"
├── Backend Agent
│   ├── Generate Express.js server
│   ├── Create route handlers
│   └── Add middleware
├── Database Agent
│   ├── Design schema
│   ├── Generate migrations
│   └── Seed data
├── Testing Agent
│   ├── Generate API tests
│   ├── Generate integration tests
│   └── Run tests
└── Documentation Agent
    ├── Generate API docs
    ├── Generate README
    └── Generate examples
```

**Implementation**:

```typescript
async function buildRestAPI(spec: APISpec) {
  // 1. Spawn sub-agents in parallel
  const [backend, database, tests, docs] = await Promise.all([
    spawnAgent({
      type: "backend",
      prompt: `Generate Express.js server with routes: ${spec.routes}`
    }),
    spawnAgent({
      type: "database",
      prompt: `Design database schema for: ${spec.models}`
    }),
    spawnAgent({
      type: "testing",
      prompt: `Generate tests for API spec: ${spec}`
    }),
    spawnAgent({
      type: "docs",
      prompt: `Generate documentation for: ${spec}`
    })
  ])

  // 2. Integrate results
  const project = {
    backend: backend.result,
    database: database.result,
    tests: tests.result,
    docs: docs.result
  }

  // 3. Verify integration
  await verifyProject(project)

  return project
}
```

**Requirements**:
1. Main agent coordinates sub-agents
2. Sub-agents work independently
3. Results are integrated
4. System handles failures gracefully

**Extensions**:
- Add frontend agent
- Add deployment agent
- Add monitoring agent
- Add error recovery

---

### Project 8: AI-Powered Debugger

**Objective**: Build an agent that debugs code

**Concepts**:
- Error analysis
- Stack trace parsing
- Hypothesis generation
- Fix suggestion

**Requirements**:
1. Parse error message and stack trace
2. Identify error location
3. Analyze surrounding code
4. Generate hypotheses
5. Suggest fixes
6. Apply fixes and verify

**Example Flow**:

```
1. User: "Debug this error"
   Error: TypeError: Cannot read property 'name' of undefined

2. Agent reads stack trace → Identifies line 42 in user.ts

3. Agent reads user.ts → Sees:
   const userName = user.profile.name

4. Agent hypothesizes:
   - user might be undefined
   - user.profile might be undefined

5. Agent suggests fix:
   const userName = user?.profile?.name || 'Unknown'

6. Agent applies fix and re-runs tests

7. Agent reports: "Fixed! Added optional chaining."
```

**Implementation**:

```typescript
async function debugError(error: Error) {
  // 1. Parse stack trace
  const stack = parseStackTrace(error.stack)
  const topFrame = stack[0]

  // 2. Read file at error location
  const code = await readFile(topFrame.file)
  const errorLine = code.split('\n')[topFrame.line - 1]

  // 3. Analyze context
  const context = extractContext(code, topFrame.line, 10)

  // 4. Generate hypotheses
  const hypotheses = analyzeError(error, errorLine, context)

  // 5. Suggest fixes
  const fixes = hypotheses.map(h => generateFix(h))

  // 6. Apply best fix
  const applied = await applyFix(fixes[0])

  // 7. Verify
  const verified = await runTests()

  return { fix: applied, verified }
}
```

**Extensions**:
- Add learning from past fixes
- Add multi-error debugging
- Add performance profiling
- Add security vulnerability detection

---

### Project 9: Intelligent Project Scaffolder

**Objective**: Build an agent that creates project templates

**Concepts**:
- Template generation
- Dependency management
- Configuration files
- Best practices

**Requirements**:
1. Ask user about project type
2. Generate appropriate file structure
3. Install dependencies
4. Configure tools (linter, formatter, tests)
5. Create documentation

**Example**:

```
User: "Create a new React app with TypeScript and Tailwind"

Agent:
1. Creates file structure:
   my-app/
   ├── src/
   │   ├── App.tsx
   │   ├── index.tsx
   │   └── components/
   ├── public/
   ├── package.json
   ├── tsconfig.json
   ├── tailwind.config.js
   └── README.md

2. Installs dependencies:
   - react, react-dom
   - typescript, @types/react
   - tailwindcss
   - vite

3. Configures tools:
   - ESLint
   - Prettier
   - Vitest

4. Creates README with instructions
```

**Implementation**:

```typescript
async function scaffoldProject(spec: ProjectSpec) {
  // 1. Ask questions
  const answers = await askUser([
    { question: "Project name?", type: "text" },
    { question: "Framework?", options: ["React", "Vue", "Svelte"] },
    { question: "Language?", options: ["TypeScript", "JavaScript"] },
    { question: "Styling?", options: ["Tailwind", "CSS Modules", "Styled Components"] }
  ])

  // 2. Generate file structure
  const template = selectTemplate(answers)
  await generateFiles(template, answers)

  // 3. Install dependencies
  await runCommand(`cd ${answers.name} && npm install`)

  // 4. Configure tools
  await configureESLint(answers)
  await configurePrettier(answers)
  await configureTests(answers)

  // 5. Initialize git
  await runCommand(`cd ${answers.name} && git init`)

  return { success: true, path: answers.name }
}
```

**Extensions**:
- Add more frameworks
- Add Docker support
- Add CI/CD setup
- Add database setup

---

## Capstone Project

### Project: Full-Stack Development Agent

**Objective**: Build a comprehensive agent system that can develop complete applications

**Scope**: Combine all learned concepts into one production-ready system

**Requirements**:

#### 1. Project Management
- Create project from description
- Generate user stories
- Create task breakdown
- Track progress

#### 2. Code Generation
- Generate backend (API, database)
- Generate frontend (UI components)
- Generate tests
- Generate documentation

#### 3. Quality Assurance
- Run linters
- Run tests
- Check code coverage
- Review code quality

#### 4. Deployment
- Build for production
- Generate Docker files
- Deploy to server
- Verify deployment

**Example Usage**:

```
User: "Build a blog application with user authentication"

Agent:
1. [Planning] Generates project plan:
   - User authentication (login/register)
   - Blog post CRUD
   - Comments
   - User profiles

2. [Database] Creates schema:
   - Users table
   - Posts table
   - Comments table

3. [Backend] Generates API:
   - POST /auth/register
   - POST /auth/login
   - GET/POST /posts
   - POST /posts/:id/comments

4. [Frontend] Generates UI:
   - Login/Register pages
   - Blog feed
   - Post editor
   - Comment section

5. [Testing] Generates tests:
   - Unit tests for auth
   - Integration tests for API
   - E2E tests for UI

6. [Deployment] Deploys app:
   - Builds Docker image
   - Pushes to registry
   - Deploys to cloud
   - Verifies health

7. [Documentation] Generates docs:
   - API documentation
   - User guide
   - Developer setup
   - Architecture diagram
```

**Architecture**:

```
Main Orchestrator
├── Planning Agent
│   └── Generates project structure
├── Backend Team
│   ├── Database Agent
│   ├── API Agent
│   └── Auth Agent
├── Frontend Team
│   ├── Components Agent
│   ├── Routing Agent
│   └── Styling Agent
├── Testing Team
│   ├── Unit Test Agent
│   ├── Integration Test Agent
│   └── E2E Test Agent
├── DevOps Team
│   ├── Docker Agent
│   ├── CI/CD Agent
│   └── Deployment Agent
└── Documentation Agent
```

**Implementation Phases**:

**Phase 1: Planning (Week 1)**
- User requirement gathering
- Project structure generation
- Task breakdown

**Phase 2: Development (Weeks 2-4)**
- Database design and setup
- Backend API generation
- Frontend UI generation
- Integration

**Phase 3: Testing (Week 5)**
- Test generation
- Test execution
- Coverage analysis
- Bug fixing

**Phase 4: Deployment (Week 6)**
- Docker containerization
- CI/CD pipeline
- Cloud deployment
- Monitoring setup

**Phase 5: Documentation (Week 7)**
- API documentation
- User documentation
- Code documentation
- Video tutorials

**Phase 6: Polish (Week 8)**
- Code review and refactoring
- Performance optimization
- Security audit
- Final testing

---

## Best Practices

### 1. Error Handling

```typescript
// GOOD: Structured error with recovery hints
return {
  success: false,
  error: "File not found: app.ts",
  suggestion: "Did you mean app.tsx? Or run 'ls src/' to see available files",
  recovery: ["create_file", "search_files"]
}

// BAD: Throw without context
throw new Error("File not found")
```

### 2. Logging and Debugging

```typescript
// Add verbose logging
if (config.verbose) {
  console.log(`[Tool] Executing ${toolName}`)
  console.log(`[Input] ${JSON.stringify(input)}`)
}

// Log tool execution time
const start = Date.now()
const result = await tool.execute(input)
const duration = Date.now() - start
console.log(`[Tool] ${toolName} completed in ${duration}ms`)
```

### 3. Testing

```typescript
// Test tools in isolation
describe('CalculatorTool', () => {
  it('should evaluate simple expressions', async () => {
    const result = await CalculatorTool.execute(
      { expression: '2 + 2' },
      mockContext
    )
    expect(result).toBe(4)
  })

  it('should handle errors gracefully', async () => {
    const result = await CalculatorTool.execute(
      { expression: '10 / 0' },
      mockContext
    )
    expect(result.error).toContain('division by zero')
  })
})
```

### 4. Documentation

```typescript
/**
 * Calculates the sum of an array of numbers.
 *
 * @param numbers - Array of numbers to sum
 * @returns The sum of all numbers
 *
 * @example
 * ```typescript
 * const total = sum([1, 2, 3, 4])  // 10
 * ```
 *
 * @throws {Error} If input is not an array of numbers
 */
function sum(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0)
}
```

### 5. Performance

```typescript
// Cache expensive operations
const cache = new Map()

async function expensiveOperation(key: string) {
  if (cache.has(key)) {
    return cache.get(key)
  }

  const result = await doExpensiveWork(key)
  cache.set(key, result)
  return result
}

// Parallelize independent operations
const [result1, result2, result3] = await Promise.all([
  operation1(),
  operation2(),
  operation3()
])
```

---

## Troubleshooting Guide

### Common Issues

#### Issue: "Tool not found"

**Cause**: Tool not registered
**Solution**:
```typescript
// Add to tools array
const tools = [
  ...existingTools,
  MyNewTool  // Don't forget to add it!
]
```

#### Issue: "Schema validation failed"

**Cause**: Input doesn't match schema
**Solution**:
```typescript
// Check schema matches your input
const inputSchema = z.object({
  name: z.string()  // Required!
})

// Provide all required fields
tool.execute({ name: "value" })
```

#### Issue: "Permission denied"

**Cause**: Tool requires user approval
**Solution**:
```typescript
// Change permission mode
checkPermissions() {
  return { behavior: 'auto' }  // Auto-approve
}

// Or ask user
checkPermissions() {
  return {
    behavior: 'ask',
    message: 'Allow this operation?'
  }
}
```

#### Issue: "Context window exceeded"

**Cause**: Conversation too long
**Solution**:
```typescript
// Implement compression
const compressed = compressMessages(messages, {
  maxTokens: 100000,
  strategy: 'snip'
})
```

#### Issue: "Agent stuck in loop"

**Cause**: No termination condition
**Solution**:
```typescript
// Add max turns limit
const config = {
  ...otherConfig,
  maxTurns: 50  // Prevent infinite loops
}
```

---

## Graduation Criteria

You've mastered AI agent development when you can:

- [ ] Build tools from scratch
- [ ] Implement the query loop
- [ ] Handle errors gracefully
- [ ] Manage state effectively
- [ ] Spawn and coordinate sub-agents
- [ ] Integrate external systems (MCP)
- [ ] Build plugins
- [ ] Compress context
- [ ] Deploy production agents

**Congratulations!** You're now ready to build production AI agents.

---

## What's Next?

### Further Learning

1. **Read research papers**:
   - "ReAct: Synergizing Reasoning and Acting in Language Models"
   - "Toolformer: Language Models Can Teach Themselves to Use Tools"
   - "AutoGPT: Autonomous GPT-4 Agents"

2. **Explore other frameworks**:
   - LangChain
   - AutoGPT
   - BabyAGI
   - Semantic Kernel

3. **Contribute**:
   - Build open-source agents
   - Share your learnings
   - Help others learn

### Career Paths

- **AI Engineer**: Build production AI systems
- **Agent Researcher**: Research new agent architectures
- **Developer Tools**: Build AI-powered dev tools
- **Consulting**: Help companies adopt AI agents

---

**You've completed the study guide!**

Now go build amazing AI agents! 🚀

---

*Last updated: March 31, 2026*
