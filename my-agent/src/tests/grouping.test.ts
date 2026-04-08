import { test, expect, describe } from 'bun:test';
import { groupMessagesByApiRound } from '../utils/grouping';
import type { Message } from '../types';
import { createUserMessages, createAssistantMessage, createToolMessage } from '../types/';

describe('测试上下文压缩', () => {
    test('测试groupMessagesByApiRound', () => {
        let messages: Message[] = [
        ];
        let grouped = groupMessagesByApiRound(messages);
        expect(grouped.length).toBe(0);

        messages.push(createUserMessages(["Hello, world!"]));
        messages.push(createAssistantMessage("Hi! How can I assist you today?"));
        grouped = groupMessagesByApiRound(messages);
        expect(grouped.length).toBe(2);

        messages = [];
        messages.push(createUserMessages(["Hello, world!"]));
        messages.push(createAssistantMessage("Hi! How can I assist you today?", [
            {   type: "function",
                id: "1",
                function: {
                    arguments: "echo 'Hello, world!'",
                    name: "bash"
                }
            },
            {
                type: "function",
                id: "2",
                function: {
                    arguments: "echo 'Hello, world!'",
                    name: "bash"
                }
            }
        ]));
        messages.push(createToolMessage("1", "Hello, world!"));
        messages.push(createToolMessage("2", "Hello, world!"));
        messages.push(createAssistantMessage("ok ,stop it!"));
        grouped = groupMessagesByApiRound(messages);
        expect(grouped.length).toBe(3);

        messages = [];
        messages.push(createAssistantMessage("Hi! How can I assist you today?"));
        messages.push(createAssistantMessage("Hi! How can I assist you today?"));
        grouped = groupMessagesByApiRound(messages);
        expect(grouped.length).toBe(2);
    });
});