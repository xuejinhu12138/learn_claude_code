import type { Command } from "./registry";
import { commandRegistry } from "./registry";

export const exitCommand: Command = {
    name: 'exit',
    description: '退出程序',
    type: 'action',
    aliases: ['quit', 'q'],
    async execute(args: string): Promise<string> {
        process.exit(0);
    }
};
