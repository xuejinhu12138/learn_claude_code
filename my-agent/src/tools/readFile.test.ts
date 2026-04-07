import { describe, test, expect } from 'bun:test'; 
import { toolRegistry } from './registry';
import './readFile';
import './writeFile';
import './bash';

describe('测试读取文件', () => {
    test('测试读取文件内容，正确', async () => {
        const tool = toolRegistry.get('read_file');
        expect(tool).toBeDefined();
        const content = await tool?.call({
            path: "/Users/xuejinhu/Desktop/dontdelete/codes/agentic-ai-from-claude-code/my-agent/src/history.test.ts"
        })
        console.log(content);
        expect(content).toContain("测试历史消息");
    });

    test('测试读取文件内容，错误', async () => {
        const tool = toolRegistry.get('read_file');
        expect(tool).toBeDefined();
        const content = await tool?.call({
            path: "/Users/xuejinhu/Desktop/dontdelete/codes/agentic-ai-from-claude-code/my-agent/src/history"
        })
        console.log(content);
        expect(content).toContain("Error")
    });

    test('测试写文件内容，正确', async () => {
        const tool = toolRegistry.get('write_file');
        expect(tool).toBeDefined();
        const res = await tool?.call({
            path: "/Users/xuejinhu/Desktop/dontdelete/codes/agentic-ai-from-claude-code/my-agent/src/tests/test.txt",
            content: "测试写入文件内容"
        });
        console.log(res);
        expect(res).toBe("File written successfully");
    });

    test('测试写文件内容后读取，正确', async () => {
        const writeTool = toolRegistry.get('write_file');
        const readTool = toolRegistry.get('read_file');
        expect(writeTool).toBeDefined();
        expect(readTool).toBeDefined();

        const path = "/Users/xuejinhu/Desktop/dontdelete/codes/agentic-ai-from-claude-code/my-agent/src/tests/test.txt";
        const contentToWrite = "测试写入文件内容后读取";

        const writeRes = await writeTool?.call({
            path,
            content: contentToWrite
        });
        console.log(writeRes);
        expect(writeRes).toBe("File written successfully");

        const readRes = await readTool?.call({ path });
        console.log(readRes);
        expect(readRes).toBe(contentToWrite);
    });

    test('测试bash工具，正确', async () => {
        const tool = toolRegistry.get('bash');
        expect(tool).toBeDefined();
        const res = await tool?.call({
            command: "echo Hello, world!"
        });
        console.log(res);
        expect(res).toBe("Hello, world!\n");
    });
    
    test('测试bash工具，错误', async () => {
        const tool = toolRegistry.get('bash');
        expect(tool).toBeDefined();
        const res = await tool?.call({
            command: "some_non_existent_command"
        });
        console.log(res);
        expect(res).toContain("Error");
    });
});