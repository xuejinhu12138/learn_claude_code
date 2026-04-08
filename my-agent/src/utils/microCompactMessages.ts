import type { Message } from '../types';

// 只处理tool消息；超过截取后末尾添加总长度；返回新数组
function microCompactMessages(messages: Message[], maxChars: number): Message[] {
    // 用 ... 只能拷贝一层！
    // let newMessages: Message[] = [...messages];
    let newMessages: Message[] = structuredClone(messages);
    for (let msg of newMessages) {
        if (msg.role === "tool") {
            for (let block of msg.content) {
                let truncatedContent = block.text;
                if (truncatedContent.length > maxChars) {
                    truncatedContent = truncatedContent.slice(0, maxChars) + `\n\n[输出过长，已截断，原始长度: ${truncatedContent.length}字符]`;
                }
                block.text = truncatedContent;
            }
        }
    }
    return newMessages;
}

export { microCompactMessages };