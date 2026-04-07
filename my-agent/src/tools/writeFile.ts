import type { Tool } from "../types/tool";
import { toolRegistry } from "./registry";
import { readFileSync, writeFileSync } from "fs";
import { z } from "zod";

const WriteFileInputSchema = z.object({
    path: z.string(),
    content: z.string()
});


const writeFileTool: Tool = {
    name: "write_file",
    description: "Write content to a file given its path.",
    inputSchema: {
        type: "object",
        properties: {
            path: { 
                type: "string",
                description: "The path to the file to be written." 
            },
            content: {
                type: "string",
                description: "The content to write to the file."
            }
        },
        required: ["path", "content"]
    },
    call(input: unknown): Promise<string> {
        try {
            const parsed = WriteFileInputSchema.safeParse(input);
            if (!parsed.success) {
                return Promise.resolve(`Error writing file: ${parsed.error.message}`);
            }
            const { path, content } = parsed.data;
            writeFileSync(path, content, "utf-8");
            return Promise.resolve("File written successfully");
        } catch (error) {
            // 因为结果要回传给 LLM，LLM 需要看到错误信息来决定下一步
            return Promise.resolve(`Error writing file: ${(error as Error).message}`);
        }
    }
}

toolRegistry.register(writeFileTool);

export { writeFileTool };