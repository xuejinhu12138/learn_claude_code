import type { Role } from "./role";

interface Message {
    role: Role;
    content: string;
    id? : number;
}
interface Conversation {
    messages: Message[];
    model: string;
}

type ContentBlock = 
    | { type: "text"; content: string }
    | { type: "tool_use"; name: string; input: Record<string, unknown> };

function describeBlock(block: ContentBlock): string {
    switch (block.type) {
        case "text":
            return `Text: ${block.content.slice(0, 20)}`;
        case "tool_use":
            return `Tool: ${block.name}`;
        default:
            const _exhaustiveCheck: never = block;
            throw new Error("Unknown block type");
    }
}

function createUserMessage(content: string): Message {
    return {
        role: "user",
        content
    }
}

export type { Message, Conversation, ContentBlock };
export { describeBlock, createUserMessage };