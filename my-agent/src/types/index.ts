// 类型定义入口
import { z } from "zod";

const RoleSchema = z.enum(['user', 'assistant', 'system']);
const TextBlockSchema = z.object({
    type: z.literal('text'),
    text: z.string(),
})

const ToolUseSchema = z.object({
    type: z.literal('tool_use'),
    id: z.string(),
    name: z.string(),
    input: z.unknown(),
})

const ContentBlockSchema = z.union([TextBlockSchema, ToolUseSchema]);
const MessageSchema = z.object({
    role: RoleSchema,
    content: z.array(ContentBlockSchema),
});

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

export { ContentBlockSchema, MessageSchema, RoleSchema, createUserMessage };
export type { ContentBlock, Message };

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