import type { Message, SendMessageResult } from '../types';
import { compactConversation } from './compactConversation';
import { MAX_FAILURES } from '../constants';
import { estimateHistoryTokens } from './tokenEstimation';

class AutoCompactChecker {

    private threshold: number = 0;
    private tailSize: number = 0;
    private consecutiveFailures: number = 0;

    constructor(threshold: number, tailSize: number) {
        this.threshold = threshold;
        this.tailSize = tailSize;
    }
    // 检查并在必要时压缩，返回（可能已压缩的）消息列表
    async check(
        messages: Message[],
        sendMessage: (msgs: Message[]) => Promise<SendMessageResult>
    ): Promise<Message[]>{
        if (estimateHistoryTokens(messages) <= this.threshold) {
            return new Promise(resolve => resolve(messages));
        }
        try {
            const compactedMessages = await compactConversation(messages, this.tailSize, sendMessage);
            this.consecutiveFailures = 0;
            return compactedMessages;
        } catch (error) {
            this.consecutiveFailures++;
            if (this.consecutiveFailures >= MAX_FAILURES) {
                throw new Error("连续压缩失败");
            }else {
                return new Promise(resolve => resolve(messages));
            }
        }
    }
}

function createAutoCompact(threshold: number, tailSize: number): AutoCompactChecker{
    return new AutoCompactChecker(threshold, tailSize);
}

export { createAutoCompact };