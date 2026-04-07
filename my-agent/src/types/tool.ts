type JSONSchemaProperty = {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object'
    description?: string;
    enum?: string[];
    items?: JSONSchemaProperty;
}

type JSONSchema = {
    type: "object";
    properties: Record<string, JSONSchemaProperty>;
    required?: string[];
}

type ToolDefinition = {
    name: string;
    description: string;
    input_schema: JSONSchema;
}

interface Tool {
    name: string;
    description: string;
    inputSchema: JSONSchema;
    call(input: unknown): Promise<string>;
} 


function toToolDefinition(tool: Tool): ToolDefinition {
    return {
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
    };
}

export type { JSONSchemaProperty, JSONSchema, ToolDefinition, Tool };
export { toToolDefinition };