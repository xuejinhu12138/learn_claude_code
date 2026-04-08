import type { Message } from "../types/index";

// 这个函数的目的是将消息按照 API 调用的轮次进行分组，方便后续分析和处理
// 遇到新的 assistant 消息时，结束当前组，开一个新组（把这条 assistant 消息放到新组）
// TODO：当前是单线程单会话，一次只有一个对话在跑，流式 chunk 会被合并后再存，不存在 ID 相同的多条 assistant 消息并存的情况
function groupMessagesByApiRound(messages: Message[]): Message[][]{

    const groups: Message[][] = [];
    let currentGroup: Message[] = [];
    
    for (const message of messages) {
        if (message.role === "assistant") {
            // 遇到新的 assistant 消息，结束当前组，开一个新组
            if (currentGroup.length > 0) {
                groups.push(currentGroup);
            }
            currentGroup = [message]; // 新组以这条 assistant 消息开头
        } else {
            currentGroup.push(message); // user 和 tool 消息都放在当前组里
        }
    }
    
    // 最后把剩余的消息作为最后一组
    if (currentGroup.length > 0) {
        groups.push(currentGroup);
    }
    
    return groups;
}

export { groupMessagesByApiRound };