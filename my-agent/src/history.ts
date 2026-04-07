import type { Message } from "./types";

let conversation: Message[] = [];

function addMessage(message: Message): void {
    conversation.push(message);
}

function getHistory(): Message[] {
    const copyHistory = [...conversation]; // 返回历史记录的副本，防止外部修改原始数据
    return copyHistory;
}

function clearHistory(): void {
    conversation = [];
}

function getLastMessage(): Message | undefined {
    if (conversation.length === 0) return undefined;
    return conversation[conversation.length - 1];
}

export { addMessage, getHistory, clearHistory, getLastMessage };