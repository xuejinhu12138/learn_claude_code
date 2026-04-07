import { test, expect, describe } from 'bun:test';
import { addMessage, getHistory, clearHistory, getLastMessage } from './history';


describe('测试历史消息', () => {
    test('测试addMessage', () => {
        addMessage(
            {role: "user",
            content: [
                { type: "text", text: "Hello, world!" },
                { type: "tool_use", id: "1", name: "search", input: { "query": "TypeScript" } }
            ]}
        );
        const history = getHistory();
        expect(history.length).toBe(1);
    });
    test('测试getHistory', () => {
        const history = getHistory();
        expect(history.length).toBe(1);
    });
    test('测试getLastMessage', () => {
        const lastMessage = getLastMessage();
        expect(lastMessage).toBeDefined();
        expect(lastMessage?.role).toBe("user");
    });
    test('测试clearHistory', () => {
        clearHistory();
        const history = getHistory();
        expect(history.length).toBe(0);
    });
});
