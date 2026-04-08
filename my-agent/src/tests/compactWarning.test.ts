import { test, expect, describe } from 'bun:test';
import type { Message } from '../types';
import { createUserMessages, createAssistantMessage, createToolMessage, createSystemMessage } from '../types/';
import { createCompactWarning } from '../utils/compactWarning';
import { printError } from '../utils/print';
import { tr } from 'zod/locales';

describe('测试上下文压缩', () => {
    test('测试CompactWarning', async () => {
        let messages: Message[] = [];
        let dot100 = ".".repeat(100);
        let dot10 = ".".repeat(10);
        
        let warningCount = 0;
        // threshold=50 token：空消息不触发，4条100字符消息约100token会触发
        const compactWarning = createCompactWarning(50, () => {
            warningCount++;
        });
        // 未超阈值 → 不打印
        // 超阈值第一次 → 打印警告
        // 超阈值第二次 → 不重复打印（only once）
        // reset() 后再超阈值 → 重新打印
                
        // 1. 未超阈值 → 不打印
        compactWarning.check(messages);

        // 2. 超阈值第一次 → 打印警告
        messages.push(createSystemMessage("这是系统消息"));
        messages.push(createToolMessage("1",   dot100 ));
        messages.push(createToolMessage("2",   dot100 ));
        messages.push(createToolMessage("3",   dot100 ));
        compactWarning.check(messages);
        expect(warningCount).toBe(1);
        expect(compactWarning['warningIssued']).toBe(true);

        // 3. 超阈值第二次 → 不重复打印（only once）
        compactWarning.check(messages)
        expect(compactWarning['warningIssued']).toBe(true);
        expect(warningCount).toBe(1);

        // 4. reset() 后再超阈值 → 重新打印
        compactWarning.reset();
        expect(compactWarning['warningIssued']).toBe(false);
        compactWarning.check(messages);
        expect(compactWarning['warningIssued']).toBe(true);
        expect(warningCount).toBe(2);

    });
});