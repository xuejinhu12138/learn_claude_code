import { test, expect, describe } from 'bun:test';
import type { Message } from '../types';
import { createUserMessages, createAssistantMessage, createToolMessage, createSystemMessage } from '../types/';
import { compactConversation } from '../utils/compactConversation';
import type { SendMessageResult } from '../types';

describe('测试上下文压缩', () => {
    test('测试', async () => {
        let messages: Message[] = [];
        let dot100 = ".".repeat(100);
        let dot10 = ".".repeat(10);

        const fakeSendMessage = async (_msgs: Message[]): Promise<SendMessageResult> => ({
            text: "fake摘要",
            stop_reason: "stop",
            tool_use: []
        });

        // 1.消息数 ≤ tailSize+1 时原样返回

        messages.push(createToolMessage("1",   dot100 ));
        messages.push(createToolMessage("2",   dot100 ));
        let cut_messages = await compactConversation(messages, 3, fakeSendMessage);
        expect(cut_messages).toBeDefined();
        expect(cut_messages.length).toBe(2);

        // 2.压缩后结构正确（system 在最前、倒数 tailSize 条在最后）
        messages = [];
        messages.push(createSystemMessage("系统消息"));
        messages.push(createUserMessages(["用户消息1"]));
        messages.push(createAssistantMessage("助手消息1"));
        messages.push(createUserMessages(["用户消息1"]));
        messages.push(createAssistantMessage("助手消息1"));
        messages.push(createUserMessages(["用户消息1"]));
        messages.push(createAssistantMessage("助手消息1"));
        messages.push(createUserMessages(["用户消息2"]));
        messages.push(createAssistantMessage("助手消息2"));
        cut_messages = await compactConversation(messages, 2, fakeSendMessage);
        expect(cut_messages).toBeDefined();
        expect(cut_messages.length).toBe(6);
        expect(cut_messages[0]?.role).toBe("system");
        expect(cut_messages[cut_messages.length - 1]?.content[0]?.text).toBe("助手消息2");
        expect(cut_messages[cut_messages.length - 2]?.content[0]?.text).toBe("用户消息2");

        // 3.传入 fake sendMessage（不调真实 LLM），验证结构而不是摘要内容
        messages = [];
        messages.push(createSystemMessage("系统消息"));
        messages.push(createUserMessages(["用户消息1"]));
        messages.push(createAssistantMessage("助手消息1"));
        messages.push(createUserMessages(["用户消息2"]));
        messages.push(createAssistantMessage("助手消息2"));
        cut_messages = await compactConversation(messages, 1, async (msgs) => (
            new Promise(resolve => resolve({ 
                text: "这是摘要文本",
                stop_reason: "stop",
                tool_use: []
             }))
        ));
        expect(cut_messages).toBeDefined();
        expect(cut_messages.length).toBe(4);
        expect(cut_messages[0]?.role).toBe("system");
        expect(cut_messages[1]?.content[0]?.text).toBe("对话摘要：\n这是摘要文本");
        expect(cut_messages[2]?.content[0]?.text).toBe("好的，我已了解之前的对话内容，继续协助你。");
        expect(cut_messages[3]?.content[0]?.text).toBe("助手消息2");    
    });
});