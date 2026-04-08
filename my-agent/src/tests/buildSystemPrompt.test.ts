import { test, expect, describe } from 'bun:test';
import { addMessage, getHistory, clearHistory, getLastMessage } from '../history';
import { buildSystemPrompt, type SystemPromptContext } from '../utils/buildSystemPrompt';


// 无 memory 时，输出包含角色定义、工作目录、时间、工具列表
// 有 memory 时，输出还包含项目记忆
// 工具列表为空时，正常输出（无工具行）
describe('测试系统提示词', () => {
    test('测试buildSystemPrompt', () => {
        const context: SystemPromptContext = {
            cwd: "/home/user/project",
            datetime: "2024-06-01 12:00:00",
            tools: [
                { name: "tool1", description: "这是工具1" },
                { name: "tool2", description: "这是工具2" }
            ],
            memory: "这是项目的记忆内容"
        };

        // 1. 有 memory 时，输出还包含项目记忆
        const prompt = buildSystemPrompt(context);
        expect(prompt).toContain("你是一个 AI 编程助手，帮助用户完成编程任务。");
        expect(prompt).toContain("当前工作目录：/home/user/project");
        expect(prompt).toContain("当前时间：2024-06-01 12:00:00");
        expect(prompt).toContain("- tool1: 这是工具1");
        expect(prompt).toContain("- tool2: 这是工具2");
        expect(prompt).toContain("项目记忆：\n这是项目的记忆内容");

        // 2. 无 memory 时，输出不包含项目记忆
        const contextWithoutMemory: SystemPromptContext = {
            cwd: "/home/user/project",
            datetime: "2024-06-01 12:00:00",
            tools: [
                { name: "tool1", description: "这是工具1" },
                { name: "tool2", description: "这是工具2" }
            ]
        };
        const promptWithoutMemory = buildSystemPrompt(contextWithoutMemory);
        expect(promptWithoutMemory).toContain("你是一个 AI 编程助手，帮助用户完成编程任务。");
        expect(promptWithoutMemory).toContain("当前工作目录：/home/user/project");
        expect(promptWithoutMemory).toContain("当前时间：2024-06-01 12:00:00");
        expect(promptWithoutMemory).toContain("- tool1: 这是工具1");
        expect(promptWithoutMemory).toContain("- tool2: 这是工具2");
        expect(promptWithoutMemory).not.toContain("项目记忆：");

        // 3. 工具列表为空时，正常输出（无工具行）
        const contextWithoutTools: SystemPromptContext = {
            cwd: "/home/user/project",
            datetime: "2024-06-01 12:00:00",
            tools: []
        };
        const promptWithoutTools = buildSystemPrompt(contextWithoutTools);
        expect(promptWithoutTools).toContain("你是一个 AI 编程助手，帮助用户完成编程任务。");
        expect(promptWithoutTools).toContain("当前工作目录：/home/user/project");
        expect(promptWithoutTools).toContain("当前时间：2024-06-01 12:00:00");
        expect(promptWithoutTools).not.toContain("- tool1:");
        expect(promptWithoutTools).not.toContain("- tool2:");
    });
});