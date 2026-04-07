// 类型定义入口
import { z } from "zod";

const RoleSchema = z.enum(['user', 'assistant', 'system', 'tool']);
const TextBlockSchema = z.object({
    type: z.literal('text'),
    text: z.string(),
})

const FunctionToolCall = z.object({
    arguments: z.string(),
    name: z.string(),
})

const ToolUseSchema = z.object({
    type: z.literal('function'),
    id: z.string(),
    function: FunctionToolCall
})

const ContentBlockSchema = TextBlockSchema;
const MessageSchema = z.object({
    role: RoleSchema,
    tool_call_id: z.string().optional(),
    content: z.array(ContentBlockSchema),
    tool_calls: z.array(ToolUseSchema).optional()
});

type ToolCall = z.infer<typeof ToolUseSchema>;
type ContentBlock = z.infer<typeof ContentBlockSchema>;
type Message = z.infer<typeof MessageSchema>;

function createUserMessage(content: string): Message {
    return {
        role: "user",
        content: [{
            type: "text",
            text: content
        }]
    }
}

function createSystemMessage(content: string): Message {
    return {
        role: "system",
        content: [{
            type: "text",
            text: content
        }]
    }
}

function createAssistantMessage(content: string, tool_calls?: ToolCall[]): Message {
    return {
        role: "assistant",
        content: [{
            type: "text",
            text: content
        }],
        tool_calls
    }
}

function createToolMessage(tool_call_id: string, content: string): Message {
    return {
        role: "tool",
        content: [{
            type: "text",
            text: content
        }],
        tool_call_id
    }
}

type SendMessageResult = {
    text: string;
    stop_reason: string | 'stop' | 'length' | 'tool_calls' | 'error';
    tool_use: ToolCall[];
}

export { ContentBlockSchema, MessageSchema, RoleSchema, createUserMessage, createToolMessage, createSystemMessage, createAssistantMessage };
export type { ContentBlock, Message, SendMessageResult, ToolCall };

// const result = MessageSchema.safeParse({
//     role: "user",
//     content: [
//         { type: "text", text: "Hello, world!" },
//         { type: "tool_use", id: "1", name: "search", input: { "query": "TypeScript" } }
//     ]
// })
// if (!result.success) {
//     console.error("Validation failed:", result.error.issues);
// } else {
//     console.log("Validation succeeded:", result.data);
// }