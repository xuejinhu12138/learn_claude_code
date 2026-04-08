import { Box, Text, useInput, render } from 'ink';
import { toolRegistry } from '../tools/registry';
import '../tools/index';
import { useAppState } from './useAppState';
import { appStore } from './store';
import { createDefaultDeps, runAgent } from '../agent';
import { initState } from '../bootstrap/state';

initState(true);
const tool_names = toolRegistry.list().map(tool => tool.name);
const depsAgent = createDefaultDeps();

function MessageList(){
    const {messages, streamingText, isLoading} = useAppState();
    let displayMessages = isLoading ? 
        [
            ...messages, 
            {role: 'assistant' as const, text: streamingText}
        ] : messages;
    return (
        <Box flexDirection='column' >
            {
                displayMessages.map((msg, index) => (
                    <Box key={index} flexDirection='row' marginBottom={1}>
                        <Text color={msg.role === 'user' ? 'cyan' : 'green'}>
                            {msg.role === 'user' ? '你> ' : 'AI> '}{msg.text}
                        </Text>
                    </Box>
                ))
            }
        </Box>
    )
}

function StatusBar() {
    const { inputValue } = useAppState();  // 从 store 订阅，变化时自动重渲染，整个函数都会重新执行
    useInput((input, key) => {
        // 退出：只有输入框为空时 q/Escape 才退出
        if ((input === 'q' || key.escape) && inputValue === '') process.exit(0);

        // 退格删除
        if (key.backspace) {
            appStore.set(prev => ({
                ...prev,
                inputValue: prev.inputValue.slice(0, -1)
            }));
            return;
        }

        // 回车发送消息: 消息放到状态内；清除输入框；设置加载状态；调用 runAgent 处理消息
        if (key.return) {
            if (inputValue.trim() === '') return;  // 空消息不发送
            const currentInput = inputValue;  // 先保存当前输入的值，避免状态更新后丢失
            appStore.set(prev => ({
                ...prev,
                messages: [...prev.messages, { role: 'user' as const, text: currentInput }],
                inputValue: "",
                isLoading: true,
                streamingText: ""
            }));
            (async () => {
                await runAgent(currentInput, depsAgent);
                const assistantMessages = depsAgent.getHistory().filter(msg => msg.role === 'assistant');
                const lastAssistantMsg = assistantMessages[assistantMessages.length - 1]?.content[0]?.text;
                if (lastAssistantMsg) {
                    appStore.set(prev => ({
                        ...prev,
                        messages: [...prev.messages, { role: 'assistant' as const, text: lastAssistantMsg }],
                        isLoading: false,
                        streamingText: ""
                    }));
                }
            })();
            return;
        }

        // 普通字符追加到输入框
        if (input && !key.ctrl && !key.meta) {
            appStore.set(prev => ({
                ...prev,
                inputValue: prev.inputValue + input
            }));
        }
    });

    return (
        <Box flexDirection='row' marginTop={1}>
            <Text color='gray'>{`> ${inputValue}_`}</Text>
        </Box>
    )
}

function App({ tool_names }: { tool_names: string[] }) {

    return (
        <Box flexDirection='column'>
            <Text>my-agent</Text>
            <Text>------------------------</Text>
            <MessageList />
            <Text>------------------------</Text>
            <StatusBar />
        </Box>
    );
}

render(<App tool_names={tool_names}/>);