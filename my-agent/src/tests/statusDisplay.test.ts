import { test, expect, describe, beforeEach } from 'bun:test';
import { appStore } from '../ui/store';

describe('测试状态显示', () => {
    // 每个测试前重置状态
    beforeEach(() => {
        appStore.set(() => ({
            messages: [],
            isLoading: false,
            inputValue: "",
            streamingText: "",
            pendingConfirmation: undefined,
            currentStatus: undefined,
            showTokenWarning: false,
        }));
    });

    test('状态更新正常', () => {
        // 初始状态
        expect(appStore.get().currentStatus).toBeUndefined();

        // 设置状态
        appStore.set(prev => ({ ...prev, currentStatus: "正在思考..." }));
        expect(appStore.get().currentStatus).toBe("正在思考...");

        // 清除状态
        appStore.set(prev => ({ ...prev, currentStatus: undefined }));
        expect(appStore.get().currentStatus).toBeUndefined();
    });

    test('Token 警告显示', () => {
        // 初始状态
        expect(appStore.get().showTokenWarning).toBe(false);

        // 显示警告
        appStore.set(prev => ({ ...prev, showTokenWarning: true }));
        expect(appStore.get().showTokenWarning).toBe(true);

        // 隐藏警告
        appStore.set(prev => ({ ...prev, showTokenWarning: false }));
        expect(appStore.get().showTokenWarning).toBe(false);
    });
});
