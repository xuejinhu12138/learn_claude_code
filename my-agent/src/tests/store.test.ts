import { describe, test, expect } from "bun:test";
import { Store } from "../ui/store";

describe('Store', () => {

    test("get() 返回初始状态", () => {
        const store = new Store({ count: 0 });
        expect(store.get()).toEqual({ count: 0 });
    });

    test("set() 后 get() 返回新状态", () => {
        const store = new Store({ count: 0 });
        store.set(prev => ({ count: prev.count + 1 }));
        expect(store.get()).toEqual({ count: 1 });
    });

    test("subscribe 的 listener 在每次 set 后被调用", () => {
        const store = new Store({ count: 0 });
        let callCount = 0;
        store.subscribe(() => callCount++);
        store.set(prev => ({ count: prev.count + 1 }));
        store.set(prev => ({ count: prev.count + 1 }));
        expect(callCount).toBe(2);
    });

    test("取消订阅后 listener 不再被调用", () => {
        const store = new Store({ count: 0 });
        let callCount = 0;
        const unsubscribe = store.subscribe(() => callCount++);
        store.set(prev => ({ count: prev.count + 1 })); // 调用1次
        unsubscribe();                                   // 取消订阅
        store.set(prev => ({ count: prev.count + 1 })); // 不再调用
        expect(callCount).toBe(1);
    });

    test("多个 listener 都能收到通知", () => {
        const store = new Store({ text: "hello" });
        const received: string[] = [];
        store.subscribe(() => received.push("A"));
        store.subscribe(() => received.push("B"));
        store.set(() => ({ text: "world" }));
        expect(received).toEqual(["A", "B"]);
    });
});