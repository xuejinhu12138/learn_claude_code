// 常量入口
export const MODEL = "gemma-4-26b-a4b-it-4bit" as const;
export const MAX_TOKENS = 8096 as const;
export const MAX_TURNS = 10 as const;
export const TOOL_USE_STOP = "tool_use" as const;
export const ANTHROPIC_API_KEY = "ANTHROPIC_API_KEY" as const;
export const API_BASE_URL = "API_BASE_URL" as const;
export const DEFAULT_BASE_URL = "http://127.0.0.1:8000/v1" as const;
export const SYSTEM_PROMPT = `你是一个有用的 AI 助手。
当前工作目录：${process.cwd()}
当前时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
` as const;