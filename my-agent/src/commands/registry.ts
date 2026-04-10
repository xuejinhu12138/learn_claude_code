import type { AgentDeps } from '../agent';

type Command = {
    name: string;
    description: string;
    aliases?: string[];

    // 命令类型：action=传统命令，prompt=技能命令
    type: 'action' | 'prompt';

    // 技能相关字段
    whenToUse?: string;         // 何时使用（给 AI 看）
    argumentHint?: string;      // 参数提示（如：<问题描述>）
    
    execute?: (args: string, deps?: AgentDeps) => Promise<string>;

    getPromptForCommand?: (args: string, deps?: AgentDeps) => Promise<string>;
};

class CommandRegistry {
    private commands = new Map<string, Command>();

    // 注册命令
    register(command: Command): void {
        // 验证：action 类型必须有 execute
        if (command.type === 'action' && !command.execute) {
            throw new Error(`Action command "${command.name}" must have execute function`);
        }

        // 验证：prompt 类型必须有 getPromptForCommand
        if (command.type === 'prompt' && !command.getPromptForCommand) {
            throw new Error(`Prompt command "${command.name}" must have getPromptForCommand function`);
        }

        // 同时注册 name 和 aliases
        if (this.get(command.name)){
            return;
        }        
        this.commands.set(command.name, command);
        if (command.aliases){
            for (const alias of command.aliases){
                if (this.get(alias)){
                    continue;
                }
                this.commands.set(alias, command);
            }
        }
    }

    // 获取命令
    get(name: string): Command | undefined {
        return this.commands.get(name);
    }

    // 列出所有命令
    list(): Command[] {
        // 去重：一个命令可能有多个别名，只返回一次
        const seen = new Set<Command>();
        const result: Command[] = [];
        
        for (const cmd of this.commands.values()) {
            if (!seen.has(cmd)) {
                seen.add(cmd);
                result.push(cmd);
            }
        }
        return result;
    }

    // 检查是否是命令
    isCommand(input: string): boolean {
        return input.trim().startsWith('/');
    }

    // 解析命令
    parse(input: string): { name: string; args: string } | null {
        if (!this.isCommand(input)) return null;
        
        const trimmed = input.trim().slice(1);  // 去掉 /
        const [name, ...argsParts] = trimmed.split(' ');
        const args = argsParts.join(' ');
        
        return { name: name!, args };
    }
}

export const commandRegistry = new CommandRegistry();

export type { Command };