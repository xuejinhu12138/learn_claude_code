import { createAssistantMessage, createUserMessage, type Message, type SendMessageResult } from '../types';
import { groupMessagesByApiRound } from './grouping';

// [system 消息（如有）] + [摘要 user 消息] + [占位 assistant 消息] + [尾部 tailSize 轮次消息]
// 如果 messages.length <= tailSize + 1，消息太少不需要压缩，原样返回
// 把 system 消息（role === 'system'）单独提取出来放最前面
// 中间部分（除去 system 和尾部）拼成一段文本，发给 LLM 请求摘要
// 发给 LLM 的 prompt 是一条 user 消息，内容："请将以下对话历史压缩成一段详细摘要，保留所有关键决策、文件名、代码片段、错误信息：\n\n${中间消息的文本表示}"
// LLM 返回的摘要文本 → 包装成一条 user 消息（content: "对话摘要：\n" + 摘要文本"）
// 摘要后面跟一条占位 assistant 消息（content: "好的，我已了解之前的对话内容，继续协助你。"）
// 最后拼上尾部 tailSize 轮次消息（保证tool+assistant成对出现，不会只保留tool消息）
async function compactConversation(
    messages: Message[],
    tailSize: number,          // 保留尾部多少条消息不压缩
    sendMessage: (msgs: Message[]) => Promise<SendMessageResult>
): Promise<Message[]> {
    const newMessages: Message[] = structuredClone(messages);

    // 1. 如果消息太少，不需要压缩，原样返回
    if (newMessages.length <= tailSize + 1) {
        return newMessages;
    }

    // 2. 提取 system 消息
    const systemMessages = newMessages.filter(msg => msg.role === 'system');

    // 提取非 system 消息并按 API 轮次分组（遇到 assistant 消息开新组），每组里 user/tool 消息保持原顺序
    const nonSystemMessages = newMessages.filter(msg => msg.role !== 'system');
    const groups = groupMessagesByApiRound(nonSystemMessages)
    const tailGroups = groups.slice(-tailSize)  // tailSize 这里变成"保留几个轮次"

    // 3. 提取尾部消息
    const tailMessages = tailGroups.flat()

    // 4. 提取中间消息并拼成文本
    const middleMessages = newMessages.filter(msg => !tailMessages.includes(msg) && !systemMessages.includes(msg));
    const middleText = middleMessages.map(msg => {
        const contentText = msg.content.map(block => block.text).join('\n');
        return `${msg.role.toUpperCase()}: ${contentText}`;
    }).join('\n');

    // 5. 构造摘要请求消息
    const summaryPrompt: Message = createUserMessage(
        `请将以下对话历史压缩成一段详细摘要，保留所有关键决策、文件名、代码片段、错误信息：\n\n${middleText}`
    );

    // 6. 发送摘要请求
    const { text: summaryText } = await sendMessage([summaryPrompt]);

    // 7. 构造摘要消息和占位消息
    const summaryMessage: Message = createUserMessage(`对话摘要：\n${summaryText}`);
    const placeholderMessage: Message = createAssistantMessage("好的，我已了解之前的对话内容，继续协助你。");
    
    // 8. 拼接最终消息列表
    return [...systemMessages, summaryMessage, placeholderMessage, ...tailMessages];
}

export { compactConversation };