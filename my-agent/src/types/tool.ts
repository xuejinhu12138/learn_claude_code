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

type FunctionDefinition = {
    name: string;
    description: string;
    parameters: JSONSchema;
}

type ToolDefinition = {
    type: "function";
    function: FunctionDefinition;
}

interface Tool {
    name: string;
    description: string;
    inputSchema: JSONSchema;
    call(input: unknown): Promise<string>;
} 


function toToolDefinition(tool: Tool): ToolDefinition {
    return {
        type: "function",
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema
        }
    };
}

export type { JSONSchemaProperty, JSONSchema, ToolDefinition, Tool };
export { toToolDefinition };