import { test, expect, describe } from 'bun:test';
import type { Message } from '../types';
import { createUserMessages, createAssistantMessage, createToolMessage, createSystemMessage } from '../types/';
import { createAutoCompact } from '../utils/autoCompact';
import type { SendMessageResult } from '../types';

describe('测试上下文压缩', () => {
    test('测试autoCompact', async () => {
        // threshold=100 token，2条100字符消息约66token不触发，8条多轮对话约137token会触发
        const autoCompact = createAutoCompact(100, 2);
        
        let messages: Message[] = [];
        let dot100 = ".".repeat(100);
        const fakeSendMessage = async (_msgs: Message[]): Promise<SendMessageResult> => ({
            text: "fake摘要",
            stop_reason: "stop",
            tool_use: []
        });

        // 消息数 ≤ threshold → 原样返回，不调 sendMessage
        // 消息数 > threshold → 调用压缩，返回更短的消息列表
        // 压缩连续失败 3 次 → 第 3 次抛出错误
        // 压缩成功后 consecutiveFailures 归零（失败 2 次后成功，第 4 次失败不抛错）

        // 1.消息数 ≤ threshold → 原样返回，不调 sendMessage
        messages.push(createToolMessage("1",   dot100 ));
        messages.push(createToolMessage("2",   dot100 ));
        let cut_messages = await autoCompact.check(messages, fakeSendMessage);
        expect(cut_messages).toBeDefined();
        expect(cut_messages.length).toBe(2);

        // 2.token 数 > threshold → 调用压缩，返回更短的消息列表
        // 构造 3 个 API 轮次（round）的多轮对话，总 token 超过 100 阈值
        // 实际约 137 token（3条 tool×33 + 3条 assistant×≈9 + 2条 user×5）
        //
        // 组 0 (被摘要):
        //   [user: "问题1"], [assistant(tool_call): "中间回答1"], [tool: dot100]
        // 组 1 (tail 保留，groups.slice(-2)[0]):
        //   [assistant(tool_call): "中间回答2"], [tool: dot100], [user: "问题2"], [tool: dot100]
        // 组 2 (tail 保留，groups.slice(-2)[1]):
        //   [assistant: "最终回答"]
        //
        // 原始 8 条消息，压缩后 = 1(summary) + 1(placeholder) + 5(tail groups 1+2) = 7 < 8
        messages = [];
        // 组 0
        messages.push(createUserMessages(["问题1"]));
        messages.push(createAssistantMessage("中间回答1", [{
            type: "function" as const, id: "t1",
            function: { name: "bash", arguments: '{"command":"ls"}' }
        }]));
        messages.push(createToolMessage("t1", dot100));
        // 组 1
        messages.push(createAssistantMessage("中间回答2", [{
            type: "function" as const, id: "t2",
            function: { name: "bash", arguments: '{"command":"pwd"}' }
        }]));
        messages.push(createToolMessage("t2", dot100));
        messages.push(createUserMessages(["问题2"]));
        messages.push(createToolMessage("t3", dot100));
        // 组 2
        messages.push(createAssistantMessage("最终回答"));
        // 共 8 条消息，约 137 token > 100，会触发压缩
        cut_messages = await autoCompact.check(messages, fakeSendMessage);
        expect(cut_messages).toBeDefined();
        // 压缩后：1(summary) + 1(placeholder) + 5(组1+组2 tail) = 7 < 8
        expect(cut_messages.length).toBeLessThan(8);

        // 3.压缩连续失败 3 次 → 第 3 次抛出错误
        let errorThrown = false;
        const failingSendMessage = async (_msgs: Message[]): Promise<SendMessageResult> => {
            return new Promise((_, reject) => reject(new Error("压缩失败")));
        };
        autoCompact['consecutiveFailures'] = 0; // 重置 consecutiveFailures
        await autoCompact.check(messages, failingSendMessage);
        await autoCompact.check(messages, failingSendMessage);
        try {
            await autoCompact.check(messages, failingSendMessage);
        } catch (error) {
            errorThrown = true;
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toBe("连续压缩失败");
        }
        expect(errorThrown).toBe(true);

        // 4.压缩成功后 consecutiveFailures 归零（失败 2 次后成功，第 4 次失败不抛错）
        autoCompact['consecutiveFailures'] = 2; // 模拟连续失败 2 次
        cut_messages = await autoCompact.check(messages, fakeSendMessage); // 第 3 次调用成功
        expect(cut_messages).toBeDefined();
        expect(autoCompact['consecutiveFailures']).toBe(0); // consecutiveFailures 应该归零

        errorThrown = false;
        try {
            await autoCompact.check(messages, failingSendMessage); // 第 4 次调用失败，但不应该抛错
        } catch (error) {
            errorThrown = true;
        }
        expect(errorThrown).toBe(false);

    });
});