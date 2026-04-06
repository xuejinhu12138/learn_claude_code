# TypeScript 速查：Phase 0 核心语法
## 类型标注

```
let x: string = "hello"
const n: number = 42
let flag: boolean = true
let list: string[] = []          // 或 Array<string>
let obj: Record<string, unknown> // 键值对
```

## 函数
```
function f(a: string, b?: number, c: boolean = true): void {}
function g(...args: string[]): void {}   // 剩余参数
```

## interface / type
```
interface Msg { role: string; content: string; id?: number }
type Role = "user" | "assistant" | "system"   // 联合类型只能用 type
```

## 判别联合 + 类型收窄
```
type Block = { type: "text"; text: string } | { type: "tool"; name: string }
switch (block.type) {
  case "text": return block.text      // TS 知道是 TextBlock
  case "tool": return block.name
  default: const _: never = block; throw new Error()  // 穷举检查
}
```

## 泛型
```
function first<T>(arr: T[]): T | undefined { return arr[0] }
interface ApiResponse<T> { success: boolean; data?: T }
```

## 模块
```
export type { Role }           // 纯类型
export { createMessage }       // 运行时值
import type { Role } from "./role"
import { createMessage } from "./message"
```


## sync/await
```
async function fetch(): Promise<string> { return "data" }
const [a, b] = await Promise.all([fetchA(), fetchB()])  // 并发
// 顶层 await 需要加 export {} 开启模块模式
```

## 工具类型
```
Partial<T>   // 所有字段可选
Pick<T, K>   // 只保留 K 字段
Omit<T, K>   // 排除 K 字段
Record<K, V> // 键值对类型
```
