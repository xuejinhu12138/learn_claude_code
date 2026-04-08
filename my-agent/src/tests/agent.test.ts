import { test, expect, describe } from 'bun:test';
import { createDefaultDeps, runAgent } from '../agent';


describe('测试agent', () => {
    test('测试发送消息', async () => {
        const fake_deps = createDefaultDeps();
        fake_deps.sendMessage = async (messages) => {
            return new Promise(resolve => resolve({ 
                text: "hello",
                stop_reason: "stop",
                tool_use: []
            }));
        }
        await runAgent("Hello, world!", fake_deps);
        const history = fake_deps.getHistory();
        console.log(history);
        expect(history.length).toBe(2);
    });
});