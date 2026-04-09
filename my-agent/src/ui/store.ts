class Store<T> {

    constructor(initialValue: T) {
        this.state = initialValue;
        this.listeners = new Set();
    }

    private state: T;
    private listeners: Set<(value: T) => void>;

    get(): T {
        return this.state;
    }

    // set的时候传递状态更新函数，接收当前状态作为参数，返回新的状态；同时调用所有监听器，传递新的状态
    set(updater: (prev: T) => T): void {
        this.state = updater(this.state);
        this.listeners.forEach(listener => listener(this.state));
    }

    subscribe(listener: (value: T) => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

}

type AppState = {
    messages: { 
        role: 'user' | 'assistant'; 
        text: string 
    }[];
    isLoading: boolean  // 是否正在等待 AI 回复（发送消息后到收到回复前的状态）
    inputValue: string  // 输入框当前内容
    streamingText: string  // 正在流式生成的文本

    // 确认对话框状态
    pendingConfirmation?: {
        message: string;
        onConfirm: () => void;
        onCancel: () => void;
    }

    currentStatus?: string    // 当前状态描述
    showTokenWarning?: boolean // 是否显示Token警告
}

const appStore = new Store<AppState>({
    messages: [],
    isLoading: false,
    inputValue: "",
    streamingText: "",

    pendingConfirmation: undefined,
    currentStatus: undefined,
    showTokenWarning: false,
});

export { appStore, Store };
export type { AppState };