# AI Agent Development Study Guide

> Learn how to build production-grade AI agents by studying Claude Code's architecture

---

## About This Study Guide

This documentation provides a structured learning path for understanding AI agent development through the Claude Code codebase - a production-grade AI coding assistant that was accidentally exposed through an npm source map leak.

**What makes this unique**: Unlike toy examples or tutorials, this is real production code (~512,000 lines) from Anthropic, showing how they architect autonomous AI agents at scale.

---

## Prerequisites

Before diving in, you should have:

- **Strong TypeScript/JavaScript knowledge**
- **Understanding of async/await and Promises**
- **Basic familiarity with AI/LLM concepts** (prompts, tokens, API calls)
- **Terminal/CLI experience**
- **Git and npm basics**

**Optional but helpful**:
- React knowledge (for understanding the UI layer)
- Experience with tool-calling LLMs (Claude, GPT-4)
- Understanding of software architecture patterns

---

## Learning Path Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     LEARNING JOURNEY                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Week 1-2: Fundamentals                                    │
│  ├─ Architecture overview                                  │
│  ├─ Core concepts (tools, permissions, context)            │
│  └─ Codebase navigation                                    │
│                                                             │
│  Week 3-4: Tool System                                     │
│  ├─ Tool definition and schemas                            │
│  ├─ Permission system                                      │
│  └─ Building custom tools                                  │
│                                                             │
│  Week 5-6: Agent Orchestration                             │
│  ├─ Query Engine deep-dive                                 │
│  ├─ Tool-calling loops                                     │
│  └─ State management                                       │
│                                                             │
│  Week 7-8: Advanced Patterns                               │
│  ├─ Multi-agent systems                                    │
│  ├─ Context management                                     │
│  └─ MCP integration                                        │
│                                                             │
│  Week 9-10: Practical Projects                             │
│  └─ Build your own agent system                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Study Guide Parts

### [Part 1: Fundamentals](./01-fundamentals.md)
**Time: 1-2 weeks**

- What is an AI agent?
- Claude Code architecture overview
- Core components and their roles
- Execution flow diagram
- Key design patterns

**Outcome**: Understand the big picture and how all pieces fit together.

---

### [Part 2: Tool System Deep-Dive](./02-tool-system.md)
**Time: 2 weeks**

- Tool anatomy and structure
- Schema definition with Zod
- Permission system architecture
- Tool execution lifecycle
- Building your first tool

**Outcome**: Build custom tools and understand the tool-calling pattern.

---

### [Part 3: Agent Orchestration](./03-orchestration.md)
**Time: 2 weeks**

- QueryEngine architecture
- The tool-calling loop
- Streaming and real-time updates
- Error handling and retries
- Context window management

**Outcome**: Understand how to orchestrate AI-driven workflows.

---

### [Part 4: Advanced Patterns](./04-advanced-patterns.md)
**Time: 2 weeks**

- Multi-agent coordination
- Sub-agent spawning
- Context compression
- MCP (Model Context Protocol)
- Plugin architecture
- Memory systems

**Outcome**: Build complex multi-agent systems.

---

### [Part 5: Practical Exercises](./05-exercises.md)
**Time: 2+ weeks**

- Hands-on coding exercises
- Progressive projects (beginner → advanced)
- Building a complete agent from scratch
- Best practices and patterns

**Outcome**: Apply your knowledge to build production-quality agents.

---

## Quick Start Guide

### 1. Clone and Explore

```bash
# This repo is already cloned
cd /Users/ahmedkhaled/claude-code

# Explore the structure
tree -L 2 src/  # or use 'ls -R src/ | head -50'
```

### 2. Essential Files to Bookmark

Create bookmarks for these core files:

```
Essential Reading:
├── src/Tool.ts              # Tool type definitions
├── src/tools.ts             # Tool registry
├── src/QueryEngine.ts       # Agent orchestration engine
├── src/main.tsx             # Entry point
└── README.md                # Architecture overview

Example Tools (Start Here):
├── src/tools/BashTool/
├── src/tools/FileReadTool/
└── src/tools/AskUserQuestionTool/

Advanced (Study Later):
├── src/tools/AgentTool/     # Sub-agents
├── src/coordinator/         # Multi-agent systems
└── src/services/mcp/        # MCP integration
```

### 3. Set Up a Study Environment

```bash
# Install dependencies (if you want to run code examples)
bun install

# Create your own experimental directory
mkdir -p experiments/my-first-agent
```

### 4. Follow the Study Plan

1. **Read each part sequentially** - they build on each other
2. **Code along** - type out examples, don't just read
3. **Do the exercises** - learning by doing is essential
4. **Build projects** - apply concepts to real problems

---

## Key Concepts You'll Learn

### 🎯 Core Agent Patterns

| Concept | What You'll Learn | Where to Find It |
|---------|-------------------|------------------|
| **Tool Calling** | How LLMs invoke functions | `src/QueryEngine.ts` |
| **Permission Gates** | Controlling dangerous operations | `src/hooks/toolPermission/` |
| **Context Management** | Managing conversation state | `src/context.ts` |
| **Streaming** | Real-time response updates | `src/QueryEngine.ts` |
| **Error Recovery** | Handling failures gracefully | `src/QueryEngine.ts` |

### 🚀 Advanced Patterns

| Pattern | Description | Implementation |
|---------|-------------|----------------|
| **Agent Swarms** | Multiple agents working together | `src/coordinator/` |
| **Sub-agents** | Spawning specialized agents | `src/tools/AgentTool/` |
| **Skills** | Reusable workflows | `src/skills/` |
| **Plugins** | Extensibility system | `src/plugins/` |
| **MCP** | Third-party tool integration | `src/services/mcp/` |

---

## How to Use This Guide

### For Self-Study

1. **Linear approach**: Go through parts 1-5 in order
2. **Time commitment**: ~2-3 hours per day for 10 weeks
3. **Active learning**: Code along with every example
4. **Projects**: Build at least 3 projects from Part 5

### For University Courses

This guide can support:

- **CS Capstone Projects**: Build an AI agent as a semester project
- **Software Engineering**: Study architecture patterns
- **AI/ML Courses**: Understand practical LLM applications
- **Security Courses**: Analyze permission systems and safety

### For Team Training

- **Week 1-2**: Group study of fundamentals
- **Week 3-4**: Team builds simple tools
- **Week 5-6**: Pair programming on agent orchestration
- **Week 7-8**: Team project: multi-agent system
- **Week 9-10**: Code review and presentations

---

## Recommended Study Schedule

### Full-Time (40 hours/week)
- **Duration**: 4-5 weeks
- **Schedule**: 8 hours/day, deep focus
- **Projects**: 2-3 substantial projects

### Part-Time (10 hours/week)
- **Duration**: 10-12 weeks
- **Schedule**: 2 hours/day on weekdays
- **Projects**: 1-2 projects

### Weekend Warrior (8 hours/week)
- **Duration**: 12-15 weeks
- **Schedule**: Saturday + Sunday sessions
- **Projects**: 1 comprehensive project

---

## Additional Resources

### Official Documentation
- [Anthropic API Docs](https://docs.anthropic.com)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Tool Use Guide](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)

### Related Technologies
- [Bun Runtime](https://bun.sh)
- [Ink (React for CLIs)](https://github.com/vadimdemedes/ink)
- [Zod Schema Validation](https://zod.dev)
- [Commander.js](https://github.com/tj/commander.js)

### Further Reading
- [Building LLM Agents (Anthropic)](https://www.anthropic.com/research/building-effective-agents)
- [AI Agent Papers (arXiv)](https://arxiv.org/list/cs.AI/recent)

---

## Getting Help

### Understanding the Code

1. **Start with simple files**: Begin with `BashTool.js`, not `QueryEngine.ts`
2. **Use TypeScript features**: Cmd+Click (VS Code) to navigate to definitions
3. **Search patterns**: Use `grep -r "pattern" src/` to find examples
4. **Read tests**: Look for `.test.ts` files for usage examples

### Common Challenges

| Challenge | Solution |
|-----------|----------|
| "Too much code!" | Start with single tools, don't read everything |
| "Don't understand TypeScript types" | Focus on runtime behavior first, types second |
| "Lost in the codebase" | Use the file reference guide in Part 1 |
| "Concepts too advanced" | Build simple versions first, iterate |

---

## Success Metrics

By the end of this guide, you should be able to:

- [ ] Explain how tool-calling agents work
- [ ] Build custom tools with proper schemas
- [ ] Implement a basic permission system
- [ ] Create a simple agent orchestration loop
- [ ] Handle streaming LLM responses
- [ ] Build a multi-agent coordinator
- [ ] Integrate external tools via MCP
- [ ] Deploy a production-ready agent

---

## Contributing to This Guide

This is a living document. If you:

- Find errors or outdated information
- Want to add examples or clarifications
- Have suggestions for improvements
- Built something cool using this guide

Feel free to submit issues or PRs!

---

## Legal & Ethics

**Important Reminders**:

- This code was accidentally exposed, not intentionally open-sourced
- Original code remains Anthropic's property
- Use for educational and defensive security research only
- Do not use this to build competing commercial products
- Respect intellectual property and licensing

---

## Next Steps

**Ready to begin?** Start with [Part 1: Fundamentals →](./01-fundamentals.md)

**Questions before starting?** Review the prerequisites and ensure you have the required background knowledge.

**Want to jump ahead?** While possible, each part builds on previous concepts. Sequential learning is recommended.

---

**Happy learning!** 🚀

*Last updated: March 31, 2026*
