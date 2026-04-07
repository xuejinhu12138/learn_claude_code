import type { Tool } from "../types/tool";
import { toolRegistry } from "./registry";
import { readFileSync } from "fs";
import { z } from "zod";

const ReadFileInputSchema = z.object({
    path: z.string()
});

const readFileTool: Tool = {
    name: "read_file",
    description: "Read the content of a file given its path.",
    inputSchema: {
        type: "object",
        properties: {
            path: { 
                type: "string",
                description: "The path to the file to be read." 
            }
        },
        required: ["path"]
    },
    call(input: unknown): Promise<string> {
        try {
            const parsed = ReadFileInputSchema.safeParse(input);
            if (!parsed.success) {
                return Promise.resolve(`Error reading file: ${parsed.error.message}`);
            }
            const path = parsed.data.path;
            const fileContent = readFileSync(path, "utf-8");
            return Promise.resolve(fileContent);
        } catch (error) {
            // 因为结果要回传给 LLM，LLM 需要看到错误信息来决定下一步
            return Promise.resolve(`Error reading file: ${(error as Error).message}`);
        }
    }
}

toolRegistry.register(readFileTool);

export { readFileTool };