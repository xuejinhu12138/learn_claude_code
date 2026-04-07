// 应用入口文件
import { parseArgs } from 'util';
import { MODEL } from './constants';
import { initState } from './bootstrap/state';
import { print, printDebug } from './utils/print';
import { sendMessage } from './api';
import * as readline from 'readline';
import { addMessage, getHistory } from './history';

const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
        debug: {type: 'boolean', short: 'd', default: false},
        model: {type: 'string', short: 'm', default: MODEL},
    },
    allowPositionals: true,
});

// 初始化全局状态
initState(values.debug);

const helpInfo: string = `
Usage: my-agent [command] [options]

Commands:
  chat     Start a chat session
  version  Show version

Options:
  -d, --debug    Enable debug mode
  -m, --model    Model to use (default: claude-opus-4-5)
`;

process.on('SIGINT', () => {
    print('再见！');
    process.exit(0);
});

function prompt(rl: readline.Interface, question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

switch (positionals[0]) {
  case 'chat':    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    }).on('close', () => {
        printDebug('再见！');
        process.exit(0);
    });
    while(true) {
        const answer = await prompt(rl, '你> ');
        switch (answer.trim()) {
            case '/exit':
            case 'exit':
            case 'quit':
                    printDebug('再见！');
                    rl.close();
                    process.exit(0);
                case '':
                    break;
                default:
                    // 放入用户输入到历史记录中
                    addMessage({
                        role: "user",
                        content: [{
                            type: "text",
                            text: answer
                        }]
                    });
                    // 流式结果会直接process.stdout到控制台，完整的结果会放到history里
                    process.stdout.write("AI> ");
                    const res = await sendMessage(getHistory()).then(({ text, stop_reason }) => {
                        printDebug(`stop_reason: ${stop_reason}`)
                        // 将AI的回复也放入历史记录中
                        addMessage({
                            role: "assistant",
                            content: [{
                                type: "text",
                                text
                            }]
                        });
                    }).catch(err => {
                        print(`Error: ${err instanceof Error ? err.message : String(err)}`)
                    });
        }
    }
    break
  case 'version': printDebug('my-agent version 0.1.0'); break
  default:        printDebug(helpInfo); break
}