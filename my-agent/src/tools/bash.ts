import type { Tool } from "../types/tool";
import { toolRegistry } from "./registry";
import { readFileSync } from "fs";
import { execSync } from "child_process";
import { z } from "zod";
import { printDebug } from "../utils/print";

const BashInputSchema = z.object({
    command: z.string()
});

const bashTool: Tool = {
    name: "bash",
    description: "Execute a bash command and return its output.",
    inputSchema: {
        type: "object",
        properties: {
            command: {
                type: "string",
                description: "The bash command to be executed." 
            }
        },
        required: ["command"]
    },
    call(input: unknown): Promise<string> {
        try {
            const parsed = BashInputSchema.safeParse(input);
            if (!parsed.success) {
                return Promise.resolve(`Error safeParse bash command: ${parsed.error.message}`);
            }
            const command = parsed.data.command;
            const result = execSync(command, { encoding: "utf-8" });
            return Promise.resolve(result);
        } catch (error) {
            // 因为结果要回传给 LLM，LLM 需要看到错误信息来决定下一步
            printDebug(`Error executing bash command: ${(error as Error).message}`);
            return Promise.resolve(`Error: ${(error as Error).message}`);
        }
    }
}

toolRegistry.register(bashTool);

export { bashTool };