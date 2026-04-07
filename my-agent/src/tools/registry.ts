import { toToolDefinition, type Tool, type ToolDefinition } from "../types/tool";

class ToolRegistry {
    private tools: Record<string, Tool> = {};

    register(tool: Tool): void {
        if (this.tools[tool.name]) {
            throw new Error(`Tool "${tool.name}" is already registered.`);
        }
        this.tools[tool.name] = tool;
    }

    get(name: string): Tool | undefined {
        return this.tools[name];
    }

    list(): Tool[] {
        return Object.values(this.tools);
    }

    toDefinitions(): ToolDefinition[] {
        return Object.values(this.tools).map(tool => toToolDefinition(tool));
    }
}

export const toolRegistry = new ToolRegistry();