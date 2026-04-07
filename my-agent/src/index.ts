// 应用入口文件
import { parseArgs } from 'util';
import { MODEL } from './constants';
import { initState } from './bootstrap/state';
import { print, printDebug } from './utils/print';
import { sendMessage } from './api';

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

switch (positionals[0]) {
  case 'chat':    
    const msg = await sendMessage([
        {
            role: "user",
            content: [{
                type: "text",
                text: "用一句话介绍你自己"
            }]
        }
    ]); 
    printDebug(`Model response: ${msg}`);
    break
  case 'version': printDebug('my-agent version 0.1.0'); break
  default:        printDebug(helpInfo)
}