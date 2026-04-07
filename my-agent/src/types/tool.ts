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

type Tool = {
    name: string;
    description: string;
    input_schema: JSONSchema;
}

export type { JSONSchemaProperty, JSONSchema, Tool };

const read_file: Tool = {
    name: "read_file",
    description: "Read the content of a file. Input should be a JSON object with a 'path' property specifying the file path.",
    input_schema: {
        type: "object",
        properties: {
            path: {
                type: "string",
                description: "The path of the file to read."
            }
        },
        required: ["path"]
    }
}