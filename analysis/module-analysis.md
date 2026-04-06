# Claude Code 源码模块全景分析

> 本文件是对 `src/` 下所有模块的系统性梳理，用于指导学习路线图的设计。

---

## 模块总表（38 个模块）

### 分层分类

```
┌─────────────────────────────────────────────────────────────┐
│                    🟢 Layer 0: 语言与环境                     │
│  TypeScript 语法 · Bun 运行时 · 测试框架                       │
├─────────────────────────────────────────────────────────────┤
│                    🔵 Layer 1: 基础设施                       │
│  types/ · constants/ · utils/(核心子集) · schemas/            │
│  bootstrap/state.ts                                         │
├─────────────────────────────────────────────────────────────┤
│                    🟡 Layer 2: CLI 与配置                     │
│  main.tsx(参数解析) · entrypoints/ · cli/                    │
│  utils/config · utils/env · utils/auth                      │
├─────────────────────────────────────────────────────────────┤
│                    🟠 Layer 3: 消息与 API                     │
│  types/message · services/api/ · query.ts                   │
│  cost-tracker.ts · services/tokenEstimation                 │
├─────────────────────────────────────────────────────────────┤
│                    🔴 Layer 4: 工具系统                       │
│  Tool.ts · tools.ts · tools/*（每个工具）                      │
│  services/tools/ · utils/permissions/                       │
├─────────────────────────────────────────────────────────────┤
│                    🟣 Layer 5: Agentic Loop                  │
│  QueryEngine.ts · query/(config,deps,stopHooks,budget)      │
│  services/compact/ · context.ts                             │
├─────────────────────────────────────────────────────────────┤
│                    🔷 Layer 6: 终端 UI                        │
│  ink/(自定义 Ink 引擎) · components/ · state/                 │
│  context/(React Contexts) · hooks/(UI hooks)                │
│  screens/REPL.tsx · keybindings/                            │
├─────────────────────────────────────────────────────────────┤
│                    🔶 Layer 7: 命令与交互                      │
│  commands.ts · commands/* · hooks/(命令相关 hooks)            │
│  skills/ · outputStyles/                                    │
├─────────────────────────────────────────────────────────────┤
│                    ⬛ Layer 8: 持久化与会话                     │
│  history.ts · utils/sessionStorage · memdir/                │
│  services/SessionMemory/ · migrations/                      │
├─────────────────────────────────────────────────────────────┤
│                    ⬜ Layer 9: 高级工具                        │
│  tools/FileEditTool · tools/GrepTool · tools/GlobTool       │
│  tools/AgentTool · tools/LSPTool · services/lsp/            │
├─────────────────────────────────────────────────────────────┤
│                    🏗️ Layer 10: 扩展与集成                     │
│  services/mcp/ · plugins/ · services/oauth/                 │
│  services/analytics/ · services/policyLimits/               │
├─────────────────────────────────────────────────────────────┤
│                    🚀 Layer 11: 多 Agent 与协作                │
│  coordinator/ · tasks/ · Task.ts                            │
│  tools/TeamCreateTool · tools/SendMessageTool               │
│  utils/swarm/ · utils/teammate*                             │
├─────────────────────────────────────────────────────────────┤
│                    🌐 Layer 12: 远程与桥接                     │
│  bridge/ · remote/ · server/                                │
│  upstreamproxy/ · services/remoteManagedSettings/           │
├─────────────────────────────────────────────────────────────┤
│                    🎨 Layer 13: 趣味与实验性                    │
│  buddy/ · voice/ · vim/ · moreright/                        │
│  services/autoDream/ · services/MagicDocs/                  │
│  assistant/ · native-ts/                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 各模块详细分析

### types/ — 纯类型定义层

| 文件 | 作用 | 教学重点 |
|------|------|---------|
| permissions.ts (442行) | 权限模式定义：7种模式(default/acceptEdits/bypassPermissions/dontAsk/plan/auto/bubble)，权限结果类型 | 联合类型、`as const`、字面量类型 |
| hooks.ts | Hook 类型定义（命令钩子/提示钩子/HTTP钩子/Agent钩子） | interface 继承 |
| ids.ts | 品牌类型（SessionId, AgentId 等）— 用类型系统区分同为 string 的不同 ID | 品牌类型模式 |
| plugin.ts | 插件类型和13种插件错误的判别联合类型 | 判别联合、错误类型设计 |
| command.ts | Command 接口定义 | interface |
| textInputTypes.ts | 输入相关类型 | — |
| logs.ts | 日志类型 | — |

### constants/ — 全局常量

| 文件 | 作用 | 教学重点 |
|------|------|---------|
| system.ts | 系统提示词模板（915行！） | 提示词工程 |
| prompts.ts | 各种预定义 prompt | 提示词设计 |
| tools.ts | 工具名称常量、允许的工具集 | 常量管理模式 |
| common.ts | 通用常量（日期格式等） | — |
| apiLimits.ts | API 限制（5MB图片、100K token结果） | — |
| xml.ts | XML 标签协议（工具输出用 XML 包装） | — |
| keys.ts | 快捷键定义 | — |

### utils/ — 工具函数集（300+ 文件，按子类分组）

| 子类 | 关键文件 | 作用 | Layer |
|------|---------|------|-------|
| **文件操作** | file.ts, fileRead.ts, fsOperations.ts, glob.ts, ripgrep.ts | 文件读写、搜索 | Layer 4 |
| **Git** | git.ts, gitDiff.ts, gitSettings.ts, git/(子目录) | Git 操作封装 | Layer 2 |
| **Shell** | Shell.ts, ShellCommand.ts, shell/(子目录), bash/(子目录) | Shell 命令执行 | Layer 4 |
| **权限** | permissions/(子目录) | 权限判断逻辑 | Layer 4 |
| **配置** | config.ts, configConstants.ts, settings/(子目录) | 配置读写 | Layer 2 |
| **认证** | auth.ts, authPortable.ts, authFileDescriptor.ts | API Key / OAuth | Layer 2 |
| **消息** | messages.ts, messages/(子目录), messagePredicates.ts | 消息构造与判断 | Layer 3 |
| **模型** | model/(子目录), modelCost.ts | 模型选择与费用 | Layer 3 |
| **会话** | sessionStorage.ts, sessionState.ts, sessionStart.ts | 会话管理 | Layer 8 |
| **错误** | errors.ts, toolErrors.ts, log.ts | 错误处理 | Layer 1 |
| **Hooks** | hooks.ts, hooks/(子目录) | 生命周期钩子系统 | Layer 7 |
| **Token** | tokens.ts, tokenBudget.ts, truncate.ts | Token 计数与裁剪 | Layer 5 |
| **进程** | process.ts, genericProcessUtils.ts, subprocessEnv.ts | 子进程管理 | Layer 4 |
| **安全** | sanitization.ts, sandbox/(子目录) | 输入消毒、沙箱 | Layer 4 |
| **数组/字符串** | array.ts, stringUtils.ts, set.ts, json.ts | 基础工具 | Layer 1 |
| **插件** | plugins/(子目录) | 插件加载 | Layer 10 |
| **Swarm** | swarm/(子目录), teammate.ts, teammateContext.ts | 多Agent | Layer 11 |

### services/ — 外部服务层（20个子模块）

| 模块 | 作用 | 重要度 | Layer |
|------|------|--------|-------|
| **api/** | Anthropic API 客户端、流式调用、重试、错误分类 | 🔴核心 | 3 |
| **mcp/** | MCP 协议客户端、Server 连接管理、认证 | 🔴核心 | 10 |
| **tools/** | 工具执行引擎、并发/串行调度、Hook 触发 | 🔴核心 | 4 |
| **compact/** | 上下文压缩、自动压缩、微压缩 | 🔴核心 | 5 |
| **oauth/** | OAuth 2.0 + PKCE 认证流程 | 🔴核心 | 2 |
| **analytics/** | 事件日志、特性开关（GrowthBook） | 🟡重要 | 10 |
| **lsp/** | Language Server Protocol 集成 | 🟡重要 | 9 |
| **SessionMemory/** | 自动会话记忆 | 🟡重要 | 8 |
| **plugins/** | 插件安装与管理 | 🟡重要 | 10 |
| **policyLimits/** | 组织策略限制 | 🟡重要 | 10 |
| **tokenEstimation.ts** | Token 计数 | 🔴核心 | 3 |
| **tips/** | 上下文提示系统 | 🟢进阶 | 13 |
| **extractMemories/** | 记忆提取 | 🟢进阶 | 8 |
| **autoDream/** | 后台记忆整理 | 🟢进阶 | 13 |
| **AgentSummary/** | Agent 进度摘要 | 🟢进阶 | 11 |
| **MagicDocs/** | 自动文档维护 | 🟢进阶 | 13 |
| **PromptSuggestion/** | 后续提示建议 | 🟢进阶 | 13 |
| **toolUseSummary/** | 工具调用摘要 | 🟢进阶 | 11 |
| **teamMemorySync/** | 团队记忆同步 | 🟢进阶 | 11 |
| **settingsSync/** | 设置同步 | 🟢进阶 | 12 |

### hooks/ — React Hooks（80+ 个 Hook）

| 分类 | 关键 Hook | 作用 | Layer |
|------|----------|------|-------|
| **工具管理** | useMergedTools, useCanUseTool, useMergedCommands | 工具池组装、权限检查 | 6 |
| **输入处理** | useTextInput, useInputBuffer, usePasteHandler, useVimInput | 文本输入、粘贴、Vim | 6 |
| **UI 交互** | useTerminalSize, useVirtualScroll, useBlink, useElapsedTime | 终端尺寸、虚拟滚动 | 6 |
| **快捷键** | useCommandKeybindings, useGlobalKeybindings, useExitOnCtrlCD | 键盘绑定 | 6 |
| **会话** | useSessionBackgrounding, useRemoteSession, useSSHSession | 会话管理 | 8/12 |
| **IDE** | useIDEIntegration, useIdeConnectionStatus, useDiffInIDE | IDE 集成 | 12 |
| **配置** | useSettings, useSettingsChange, useSkillsChange | 设置变更 | 7 |
| **语音** | useVoice, useVoiceEnabled, useVoiceIntegration | 语音输入 | 13 |
| **团队** | useSwarmInitialization, useSwarmPermissionPoller | 多 Agent | 11 |
| **其他** | useUpdateNotification, usePrStatus, usePromptSuggestion | 通知、PR、建议 | 7+ |

### components/ — UI 组件（100+ 文件，25+ 子目录）

| 分类 | 关键组件 | 作用 | Layer |
|------|---------|------|-------|
| **应用壳** | App.tsx, FullscreenLayout.tsx | 根布局 | 6 |
| **消息渲染** | Messages.tsx, MessageRow.tsx, MessageResponse.tsx, VirtualMessageList.tsx | 消息显示 | 6 |
| **输入** | PromptInput/(目录), TextInput.tsx, BaseTextInput.tsx | 用户输入 | 6 |
| **代码展示** | Markdown.tsx, HighlightedCode.tsx, StructuredDiff/(目录) | 代码/Diff | 6 |
| **状态显示** | Spinner.tsx, StatusLine.tsx, Stats.tsx, TokenWarning.tsx | 加载/状态 | 6 |
| **对话框** | TrustDialog/, permissions/, 各种 *Dialog.tsx | 权限/配置确认 | 6 |
| **MCP** | mcp/(目录), MCPServer*.tsx | MCP 服务器管理 | 10 |
| **团队** | teams/(目录), agents/(目录), CoordinatorAgentStatus.tsx | 多 Agent UI | 11 |
| **设置** | Settings/(目录) | 设置面板 | 7 |
| **其他** | wizard/, Onboarding.tsx, HelpV2/, LogoV2/ | 引导/帮助 | 7 |

### 其他独立模块

| 模块 | 文件数 | 作用 | Layer |
|------|--------|------|-------|
| **state/** | 6 | 全局状态管理（AppState + Store + 副作用） | 6 |
| **context/** | 9 | React Context 层（通知、覆盖层、指标、语音） | 6 |
| **ink/** | 50+ | 自定义 Ink 终端渲染引擎（React 协调器+Yoga布局） | 6 |
| **screens/** | 3 | 全屏模式：REPL(5000行!)、Doctor、ResumeConversation | 6 |
| **keybindings/** | 14 | 快捷键系统（解析、匹配、验证、用户自定义） | 7 |
| **commands/** | 50+ | 斜杠命令实现 | 7 |
| **skills/** | 5+ | 技能系统（内置+磁盘+MCP，17个内置技能） | 7 |
| **memdir/** | 8 | 记忆目录系统（MEMORY.md + 自动记忆） | 8 |
| **migrations/** | 11 | 配置/模型迁移脚本 | 8 |
| **coordinator/** | 1 | 协调器模式（AI 只委派不执行） | 11 |
| **Task.ts + tasks.ts + tasks/** | 3+ | 后台任务系统（bash/agent/workflow） | 11 |
| **bridge/** | 20+ | 远程桥接系统（IDE↔CLI 通信） | 12 |
| **remote/** | 4 | 远程会话管理 | 12 |
| **server/** | 3 | Direct Connect 服务器 | 12 |
| **upstreamproxy/** | 2 | HTTP 代理中继 | 12 |
| **buddy/** | 6 | 虚拟宠物系统（18种 ASCII 动物） | 13 |
| **voice/** | 1 | 语音模式开关 | 13 |
| **vim/** | 5 | Vim 模式（动作、操作符、文本对象） | 13 |
| **assistant/** | 1 | Kairos 助手模式会话历史 | 13 |
| **native-ts/** | 3子目录 | 原生 TS 实现（颜色diff、文件索引、Yoga布局） | 6 |
| **outputStyles/** | 1 | 输出风格加载器（markdown 自定义风格） | 7 |
| **moreright/** | 1 | 实验性功能 | 13 |
| **bootstrap/** | 1(1759行) | 进程级全局状态（会话ID、费用、遥测） | 1 |
| **entrypoints/** | 5+子目录 | 14种启动方式（CLI/MCP/SDK/Bridge/Daemon...） | 2 |
| **cli/** | 8+ | CLI 输出模式（交互式/结构化/远程） | 2 |
| **query/** | 4 | 单次查询的配置快照、依赖注入、停止钩子、Token 预算 | 5 |

---

## 教学顺序建议

### 必学模块（Phase 0-10，覆盖核心功能）

按依赖关系排序，后面的依赖前面的：

1. TS 语法 → 2. types/ → 3. constants/(子集) → 4. utils/(基础子集)
5. bootstrap/ → 6. entrypoints/(概念) → 7. cli/(概念)
8. utils/messages → 9. services/api/ → 10. query.ts → 11. cost-tracker
12. Tool.ts → 13. tools.ts → 14. tools/FileReadTool → 15. tools/BashTool
16. utils/permissions/ → 17. services/tools/
18. QueryEngine.ts → 19. query/(config/budget) → 20. services/compact/
21. context.ts → 22. ink/(概念) → 23. state/ → 24. context/(React Contexts)
25. components/(核心) → 26. hooks/(核心) → 27. screens/REPL.tsx(概念)
28. commands.ts → 29. commands/(基础) → 30. keybindings/(概念)
31. skills/(概念) → 32. memdir/(概念) → 33. history.ts → 34. sessions
35. tools/FileEditTool → 36. tools/GrepTool → 37. tools/GlobTool
38. services/mcp/ → 39. plugins/ → 40. services/oauth/

### 选学模块（Phase 11-13，按兴趣）

- 多 Agent：coordinator/ → Task.ts → tools/AgentTool → utils/swarm/
- 远程桥接：bridge/ → remote/ → server/
- LSP：services/lsp/ → tools/LSPTool
- 语音：voice/ → hooks/useVoice
- Vim：vim/
- 宠物：buddy/
