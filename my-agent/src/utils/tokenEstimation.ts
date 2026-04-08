import { type Message } from '../types';

// 取消息里所有 content block 的 text 拼起来，字符数 / 3.5，向上取整
// role 字段本身算 4 个 token（固定开销）
// tool_calls 里的 arguments 字符串也要计入
// 估算单条消息的 token 数
function estimateMessageTokens(message: Message): number {
    let tokenCount = 0;

    // 1. 计算 content 中所有 block 的 text token 数
    for (const block of message.content) {
        tokenCount += Math.ceil(block.text.length / 3.5);
    }

    // 2. 加上 role 字段的固定开销
    tokenCount += 4;

    // 3. 如果有 tool_calls，也要加上 arguments 的 token 数
    if (message.tool_calls) {
        for (const call of message.tool_calls) {
            const argsStr = call.function.arguments;
            tokenCount += Math.ceil(argsStr.length / 3.5);
        }
    }
    return tokenCount;
}

// 估算整个 history 的总 token 数
function estimateHistoryTokens(messages: Message[]): number {
    let totalTokens = 0;
    for (const message of messages) {
        totalTokens += estimateMessageTokens(message);
    }
    return totalTokens;
}

export { estimateMessageTokens, estimateHistoryTokens };