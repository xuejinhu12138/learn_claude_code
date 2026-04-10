# 高级工具实现原理（P9-1/P9-2/P9-3）

> **文档说明**：本文档记录 FileEditTool、GrepTool、GlobTool 的核心实现原理，不包含详细代码，仅作为学习参考。

---

## 1. FileEditTool（文件精确编辑）

### 核心问题

为什么不直接用 `write_file` 重写整个文件？

**问题**：
- 大文件消耗大量 token
- 容易遗漏代码（LLM 生成不完整）
- 难以追踪变更（无 diff）
- 无法防止并发冲突

**解决方案**：FileEditTool 通过**字符串精确匹配**来定位和替换代码片段。

---

### 实现原理

#### 1.1 必须先读再写（Read-Edit-Write）

```
用户: 修改 app.ts，添加导入语句
    ↓
AI: 调用 read_file('app.ts')  ← 记录读取时间戳
    ↓
AI: 调用 file_edit({
      file_path: 'app.ts',
      old_string: 'import { foo } from "./foo";',
      new_string: 'import { foo } from "./foo";\nimport { bar } from "./bar";'
    })
    ↓
Tool: 检查文件是否已读取 ✓
Tool: 检查文件是否被外部修改（时间戳对比）✓
Tool: 在文件中查找 old_string ✓
Tool: 替换为 new_string
Tool: 写入文件 + 更新时间戳
```

**关键点**：
- 在 `AgentDeps` 中维护 `readFileState: Map<filePath, {content, timestamp}>`
- `read_file` 工具调用后，记录文件路径、内容和读取时间
- `file_edit` 工具调用前，必须检查文件是否在 `readFileState` 中
- 写入前，再次读取文件，对比时间戳或内容，确保未被外部修改
- 写入后，更新 `readFileState` 的时间戳

#### 1.2 唯一性检查

```typescript
const matches = fileContent.split(old_string).length - 1;

if (matches === 0) {
    throw Error('String not found in file');
}

if (matches > 1 && !replace_all) {
    throw Error('Found multiple matches. Use replace_all or provide more context.');
}
```

**为什么需要唯一性？**
- 如果 `old_string` 出现多次，无法确定要替换哪一个
- AI 需要提供更多上下文（包含周围的代码）来唯一定位
- 或者使用 `replace_all: true` 替换所有匹配

**Claude Code 的建议**：
- 通常 2-4 行上下文就足够唯一定位
- 避免提供 10+ 行上下文（浪费 token）

#### 1.3 引号规范化（Quote Normalization）

**问题**：AI 模型输出的是直引号（`'` `"`），但文件中可能包含弯引号（`'` `'` `"` `"`）。

**解决方案**：
```typescript
function findActualString(fileContent: string, searchString: string): string | null {
    // 1. 先尝试精确匹配
    if (fileContent.includes(searchString)) return searchString;
    
    // 2. 规范化引号后再匹配
    const normalizedSearch = normalizeQuotes(searchString);
    const normalizedFile = normalizeQuotes(fileContent);
    
    if (normalizedFile.includes(normalizedSearch)) {
        // 返回文件中的原始字符串（保留弯引号）
        const index = normalizedFile.indexOf(normalizedSearch);
        return fileContent.substring(index, index + searchString.length);
    }
    
    return null;
}
```

**引号保留逻辑**：
- 如果 `old_string` 因为引号规范化才匹配成功，那么 `new_string` 也要应用相同的引号风格
- 规则：空格/换行/开括号后的引号 → 左引号，其他 → 右引号

#### 1.4 Diff 生成

使用 `diff` 库的 `structuredPatch` 生成标准的 unified diff：

```typescript
import { structuredPatch } from 'diff';

const patch = structuredPatch(
    'old-file',
    'new-file',
    oldContent,
    newContent,
    undefined,
    undefined,
    { context: 3 }  // 显示 3 行上下文
);

// patch.hunks[0].lines = [
//     ' import { foo } from "./foo";',
//     '+import { bar } from "./bar";',
//     ' import { baz } from "./baz";'
// ]
```

**Hunk 结构**：
- `oldStart`/`newStart`：变更起始行号
- `oldLines`/`newLines`：变更行数
- `lines`：每一行的变更（` ` 不变，`-` 删除，`+` 新增）

---

### 关键实现要点

1. **原子性**：读取-检查-写入必须是连续操作，避免并发冲突
2. **状态跟踪**：在 `AgentDeps` 中维护已读取文件的状态
3. **错误处理**：
   - 文件未读取 → 提示先读取
   - 文件被外部修改 → 提示重新读取
   - `old_string` 不唯一 → 提示增加上下文或使用 `replace_all`
   - `old_string` 不存在 → 提示检查拼写

---

## 2. GrepTool（代码搜索）

### 核心问题

如何在大型代码库中快速查找代码？

**传统方式的问题**：
- 逐个读取文件 → 太慢，消耗大量 token
- 不支持正则表达式 → 灵活性差

**解决方案**：基于 `ripgrep`（超快的 grep 替代品）实现全项目搜索。

---

### 实现原理

#### 2.1 核心接口

```typescript
interface GrepInput {
    pattern: string;       // 正则表达式模式
    path?: string;         // 搜索路径（默认当前工作目录）
    glob?: string;         // 文件过滤（如 "*.ts"）
    case_insensitive?: boolean;  // 忽略大小写
    context_lines?: number;      // 显示上下文行数
}

interface GrepOutput {
    matches: Array<{
        file: string;      // 文件路径
        line_number: number;
        line: string;      // 匹配的行
        context_before?: string[];  // 前 N 行
        context_after?: string[];   // 后 N 行
    }>;
}
```

#### 2.2 基于 ripgrep 的实现

```bash
# 基本用法
rg "pattern" /path/to/search

# 带选项
rg --case-insensitive \
   --context 3 \
   --glob "*.ts" \
   --json \
   "class.*Agent" \
   src/
```

**Claude Code 的实现**：
1. 构建 `rg` 命令行参数
2. 执行 `rg` 并捕获输出（`--json` 格式）
3. 解析 JSON 输出为 `GrepOutput` 结构
4. 返回给 AI

**关键优化**：
- 使用 `--json` 输出格式，避免解析文本
- 限制结果数量（如 `--max-count 100`）
- 使用 `.gitignore` 自动排除无关文件（`rg` 默认行为）

#### 2.3 使用场景

```
用户: 找到所有使用 useState 的地方
AI: 调用 grep({ pattern: "useState", glob: "*.tsx" })

用户: 查找所有导出的类
AI: 调用 grep({ pattern: "^export class" })

用户: 找到 API 调用的所有错误处理
AI: 调用 grep({ 
      pattern: "catch.*error", 
      path: "src/api/",
      context_lines: 3 
    })
```

---

### 关键实现要点

1. **性能**：`ripgrep` 比传统 `grep` 快 10-100 倍
2. **正则表达式**：支持完整的 Rust 正则语法
3. **智能过滤**：自动忽略 `.gitignore` 中的文件（node_modules、.git 等）
4. **上下文显示**：`-A`（after）、`-B`（before）、`-C`（context）选项
5. **输出限制**：避免返回数千个结果（消耗 token）

---

## 3. GlobTool（文件查找）

### 核心问题

如何快速找到符合特定模式的文件？

**场景**：
- "找到所有测试文件"
- "找到所有配置文件"
- "找到某个组件的定义文件"

---

### 实现原理

#### 3.1 核心接口

```typescript
interface GlobInput {
    pattern: string;       // Glob 模式（如 "**/*.test.ts"）
    cwd?: string;          // 搜索根目录
}

interface GlobOutput {
    files: string[];       // 匹配的文件路径列表
}
```

#### 3.2 Glob 模式语法

```
*         匹配任意字符（不包括 /）
**        匹配任意字符（包括 /）
?         匹配单个字符
[abc]     匹配 a、b 或 c
{a,b}     匹配 a 或 b

示例：
**/*.ts              所有 TypeScript 文件
src/**/test/*.spec.ts  src 下所有测试文件
*.config.{js,ts}     所有配置文件
```

#### 3.3 实现方式

**方式 1：使用 `fast-glob` 库**（Claude Code 使用）

```typescript
import fg from 'fast-glob';

const files = await fg(pattern, {
    cwd: cwd || process.cwd(),
    ignore: ['node_modules/**', '.git/**'],
    absolute: true
});
```

**方式 2：使用 `rg --files` + 手动匹配**

```bash
rg --files | grep -E "pattern"
```

#### 3.4 使用场景

```
用户: 找到所有 React 组件
AI: 调用 glob({ pattern: "**/*.tsx" })

用户: 找到所有配置文件
AI: 调用 glob({ pattern: "*.config.{js,ts,json}" })

用户: 找到 Button 组件的定义
AI: 调用 glob({ pattern: "**/Button.{ts,tsx}" })
    → 然后用 read_file 逐个检查
```

---

### 关键实现要点

1. **性能**：`fast-glob` 比 `glob` 库快很多
2. **忽略规则**：自动读取 `.gitignore` 排除文件
3. **返回格式**：返回绝对路径（方便后续工具使用）
4. **结果限制**：避免返回成千上万的文件（消耗 token）

---

## 工具对比总结

| 工具 | 用途 | 输入 | 输出 | 底层技术 |
|------|------|------|------|----------|
| **FileEditTool** | 精确修改文件内容 | 文件路径 + 旧字符串 + 新字符串 | Diff patch | `diff` 库 + 字符串匹配 |
| **GrepTool** | 搜索代码内容 | 正则表达式 + 路径 | 匹配的行 + 上下文 | `ripgrep` (rg) |
| **GlobTool** | 查找文件路径 | Glob 模式 | 文件路径列表 | `fast-glob` 库 |

---

## 为什么这三个工具如此重要？

1. **FileEditTool**：让 AI 能够**精确修改**代码，而不是重写整个文件
   - 节省 token
   - 减少错误
   - 生成清晰的 diff

2. **GrepTool**：让 AI 能够**快速定位**代码
   - 不需要逐个读取文件
   - 支持正则表达式（强大的查询能力）
   - 自动排除无关文件

3. **GlobTool**：让 AI 能够**快速发现**文件结构
   - 不需要逐级 `ls` 目录
   - 支持复杂的模式匹配
   - 快速定位特定文件

**组合使用示例**：

```
用户: 重构所有测试文件，将 describe 改为 test.describe

AI 的执行流程：
1. glob({ pattern: "**/*.test.ts" })        ← 找到所有测试文件
2. 对每个文件：
   a. read_file(filePath)                   ← 读取文件
   b. file_edit({                           ← 精确替换
        old_string: "describe(",
        new_string: "test.describe(",
        replace_all: true
      })
```

---

## 实现建议

如果要在 `my-agent` 中实现这三个工具，建议：

1. **FileEditTool**：
   - 核心是 `readFileState` 跟踪机制
   - 使用 `diff` 库生成友好的 patch
   - 实现引号规范化（可选）

2. **GrepTool**：
   - 直接调用 `rg` 命令行工具（最简单）
   - 使用 `--json` 输出格式解析结果
   - 限制返回结果数量（`--max-count`）

3. **GlobTool**：
   - 使用 `fast-glob` npm 包
   - 配置 `.gitignore` 自动排除
   - 返回绝对路径

**优先级**：FileEditTool > GrepTool > GlobTool

---

## 延伸阅读

- **ripgrep 文档**：https://github.com/BurntSushi/ripgrep
- **fast-glob 文档**：https://github.com/mrmlnc/fast-glob
- **diff 库文档**：https://github.com/kpdecker/jsdiff
- **Glob 模式语法**：https://www.malikbrowne.com/blog/a-beginners-guide-glob-patterns
