import { withRetry } from "./utils/retry";
import { describe, test, expect } from "bun:test";

describe('测试', () => {
    test("测试withRetry", async () => {
        let call_count = 0;
        const res = await withRetry(() => {
            call_count++;
            if (call_count < 3) {
                return Promise.reject(new Error("失败"));
            } else {
                return Promise.resolve("成功");
            }
        }, 3, 10)
        expect(res).toBe("成功");
        expect(call_count).toBe(3);
    });
});