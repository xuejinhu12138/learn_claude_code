import { useEffect, useState } from "react";
import { appStore, type Store, type AppState } from "./store";

// 通用版：可用于任意 Store<T>
function useStore<T>(store: Store<T>): T {
    const [, rerender] = useState(0);
    useEffect(() => {
        return store.subscribe(() => rerender(n => n + 1));
    }, []);
    return store.get();
}

// App 专用版：直接绑定 appStore，无需传参
function useAppState(): AppState {
    return useStore(appStore);
}

export { useStore, useAppState };