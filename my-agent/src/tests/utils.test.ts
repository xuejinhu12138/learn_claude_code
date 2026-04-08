import { test, expect, describe } from 'bun:test';
import { clamp, truncate } from '../utils';

describe('测试', () => {
    test('测试函数clamp', () => {
        expect(clamp(10, 0, 5)).toBe(5);
        expect(clamp(-1, 0, 5)).toBe(0);
        expect(clamp(3, 0, 5)).toBe(3);
        expect(clamp(0, 0, 5)).toBe(0);
        expect(clamp(5, 0, 5)).toBe(5);
    });
    test('测试函数truncate', () => {
        expect(truncate('Hello, world!', 5)).toBe('Hello...');
        expect(truncate('Hello, world!', 29)).toBe('Hello, world!');
        expect(truncate('Hello, world!', 10)).toBe('Hello, wor...');
    });
});