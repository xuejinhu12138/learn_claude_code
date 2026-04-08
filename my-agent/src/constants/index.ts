// 常量入口
export const MODEL = "gemma-4-26b-a4b-it-4bit" as const;
export const MAX_TOKENS = 8096 as const;
export const MAX_TURNS = 10 as const;
export const MAX_FAILURES = 3 as const;
export const TOOL_USE_STOP = "tool_use" as const;
export const ANTHROPIC_API_KEY = "ANTHROPIC_API_KEY" as const;
export const API_BASE_URL = "API_BASE_URL" as const;
export const DEFAULT_BASE_URL = "http://127.0.0.1:8000/v1" as const;

// TODO: 后续将消息条数改为token数
export const COMPACT_THRESHOLD = 30 as const;      // 超过30条消息触发压缩
export const COMPACT_TAIL_SIZE = 10 as const;       // 压缩时保留尾部10条
export const COMPACT_WARNING_THRESHOLD = 20 as const;  // 超过20条消息警告
export const MAX_TOOL_RESULT_CHARS = 10000 as const;   // 工具结果最大字符数

// token估算
export const CONTEXT_WINDOW_TOKENS = 8000       // gemma-4-26b 的 context window
export const COMPACT_TOKEN_THRESHOLD = 6000      // 超过 6000 token 触发压缩（75%）
export const COMPACT_WARNING_TOKEN_THRESHOLD = 5000  // 超过 5000 token 警告（62.5%）