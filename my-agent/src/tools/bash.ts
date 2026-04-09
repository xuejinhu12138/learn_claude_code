import type { Tool } from "../types/tool";
import { toolRegistry } from "./registry";
import { readFileSync } from "fs";
import { execSync } from "child_process";
import { z } from "zod";
import { printDebug } from "../utils/print";
import { isDangerousCommand } from "../utils/isDangerousCommand";
import { appStore } from "../ui/store";
import { resolve } from "bun";

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
    async call(input: unknown): Promise<string> {
        try {
            const parsed = BashInputSchema.safeParse(input);
            if (!parsed.success) {
                return Promise.resolve(`Error safeParse bash command: ${parsed.error.message}`);
            }
            const command = parsed.data.command;



            // 检查命令是否安全
            if (isDangerousCommand(command)) {
                // 是危险的，需要放入状态待用户确认, 用一个promise阻塞等待用户确认或取消
                const result = await new Promise<boolean>( resolve => {
                    appStore.set(prev => ({
                        ...prev,
                        pendingConfirmation: {
                            message: `执行危险命令: ${command}`,
                            onConfirm: () => {
                                appStore.set(prev => ({...prev, pendingConfirmation: undefined}));
                                resolve(true);
                            },
                            onCancel: () => {
                                appStore.set(prev => ({...prev, pendingConfirmation: undefined}));
                                resolve(false);
                            }
                        }
                    }));
                })
                if (!result) {
                    return Promise.resolve(`Error: 用户取消了执行危险命令: ${command}`);
                }
            }else {
                // 是安全的直接放行
            }

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