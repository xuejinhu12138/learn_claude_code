import { test, expect, describe } from 'bun:test';
import type { Message } from '../types';
import { createUserMessages, createAssistantMessage, createToolMessage } from '../types/';
import { microCompactMessages } from '../utils/microCompactMessages';

describe('测试上下文压缩', () => {
    test('测试microCompactMessages', () => {
        let messages: Message[] = [];
        let dot100 = ".".repeat(100);
        let dot10 = ".".repeat(10);

        // 1.tool 消息超长 → 截断 + 追加说明文字
        messages.push(createToolMessage("1",   dot100 ));
        let cut_messages = microCompactMessages(messages, 3);
        expect(cut_messages).toBeDefined();
        expect(cut_messages[0]?.content[0]?.text.length).toBeLessThan(100);

        // 2.tool 消息未超长 → 原样返回
        messages = [];
        messages.push(createToolMessage("1",   dot10 ));
        cut_messages = microCompactMessages(messages, 30);
        expect(cut_messages).toBeDefined();
        expect(cut_messages[0]?.content[0]?.text).toBe(dot10);

        // 3.user/assistant 消息不受影响
        messages = [];
        messages.push(createUserMessages([dot100]));
        messages.push(createAssistantMessage(dot100));
        cut_messages = microCompactMessages(messages, 3);
        expect(cut_messages).toBeDefined();
        expect(cut_messages[0]?.content[0]?.text).toBe(dot100);
        expect(cut_messages[1]?.content[0]?.text).toBe(dot100);

        // 4.原始消息数组没有被修改
        messages = [];
        messages.push(createToolMessage("1",   dot100 ));
        cut_messages = microCompactMessages(messages, 3);
        expect(messages[0]?.content[0]?.text).toBe(dot100);
    });
});