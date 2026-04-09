import { test, expect, describe } from 'bun:test';
import { commandRegistry } from '../commands/registry';
import '../commands/index';  // 导入所有命令（自动注册）
import { clearCommand } from '../commands/clear';
import { createDefaultDeps } from '../agent';
import { appStore } from '../ui/store';
import { createUserMessage } from '../types';

describe('测试命令系统', () => {
    test('命令注册和查找', () => {
        const cmd = commandRegistry.get('help');
        expect(cmd).toBeDefined();
        expect(cmd?.name).toBe('help');
    });

    test('命令别名', () => {
        const cmd1 = commandRegistry.get('help');
        const cmd2 = commandRegistry.get('h');
        const cmd3 = commandRegistry.get('?');
        
        // 别名指向同一个命令
        expect(cmd1).toBe(cmd2);
        expect(cmd1).toBe(cmd3);
    });

    test('命令解析', () => {
        const parsed1 = commandRegistry.parse('/help');
        expect(parsed1).toEqual({ name: 'help', args: '' });

        const parsed2 = commandRegistry.parse('/help abc def');
        expect(parsed2).toEqual({ name: 'help', args: 'abc def' });

        const parsed3 = commandRegistry.parse('not a command');
        expect(parsed3).toBeNull();
    });

    test('isCommand 识别', () => {
        expect(commandRegistry.isCommand('/help')).toBe(true);
        expect(commandRegistry.isCommand('/clear')).toBe(true);
        expect(commandRegistry.isCommand('hello')).toBe(false);
        expect(commandRegistry.isCommand('')).toBe(false);
    });

    test('clear 命令同时清空两套历史', async () => {
        // 准备：添加一些消息
        const deps = createDefaultDeps();
        deps.addMessage(createUserMessage('test 1'));
        deps.addMessage(createUserMessage('test 2'));
        
        appStore.set(prev => ({
            ...prev,
            messages: [
                { role: 'user' as const, text: 'test 1' },
                { role: 'user' as const, text: 'test 2' }
            ]
        }));

        // 执行 clear 命令
        await clearCommand.execute('', deps);

        // 验证：两套历史都被清空
        expect(deps.getHistory().length).toBe(0);
        expect(appStore.get().messages.length).toBe(0);
    });

    test('命令列表不重复', () => {
        const commands = commandRegistry.list();
        const names = commands.map(cmd => cmd.name);
        
        // 检查没有重复
        const uniqueNames = new Set(names);
        expect(uniqueNames.size).toBe(names.length);
    });

    test('cost 命令显示 Token 统计', async () => {
        const deps = createDefaultDeps();
        
        // 添加一些消息
        deps.addMessage(createUserMessage('test 1'));
        deps.addMessage(createUserMessage('test 2'));
        
        const result = await commandRegistry.get('cost')!.execute('', deps);
        
        // 验证包含统计信息
        expect(result).toContain('Token 使用情况');
        expect(result).toContain('消息统计');
        expect(result).toContain('总计：2 条');
    });

    test('compact 命令压缩历史', async () => {
        const deps = createDefaultDeps();
        
        // 添加少量消息（不够压缩）
        deps.addMessage(createUserMessage('test 1'));
        deps.addMessage(createUserMessage('test 2'));
        
        const result = await commandRegistry.get('compact')!.execute('', deps);
        
        // 验证提示消息太少
        expect(result).toContain('太短');
    });

    test('所有基础命令都已注册', () => {
        const requiredCommands = ['help', 'clear', 'exit', 'compact', 'cost'];
        
        for (const cmdName of requiredCommands) {
            const cmd = commandRegistry.get(cmdName);
            expect(cmd).toBeDefined();
            expect(cmd?.name).toBe(cmdName);
        }
    });
});
