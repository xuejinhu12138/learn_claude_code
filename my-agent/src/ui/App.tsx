import { Box, Text, useInput, render } from 'ink';
import { toolRegistry } from '../tools/registry';
import '../tools/index';
import { useAppState } from './useAppState';
import { appStore } from './store';
import { createDefaultDeps, runAgent } from '../agent';
import { initState } from '../bootstrap/state';
import { useEffect, useState } from 'react';
import { useElapsedTime } from './hooks/useElapsedTime';
import { commandRegistry } from '../commands/registry';
import '../commands/index';
import { buildSystemPrompt } from '../utils/buildSystemPrompt';
import { createSystemMessage } from '../types';
import { loadProjectInstructions } from '../utils/loadProjectInstructions';

initState(true);
const tool_names = toolRegistry.list().map(tool => tool.name);
const depsAgent = createDefaultDeps();
const projectInstructions = loadProjectInstructions() || undefined;
const systemPrompt = buildSystemPrompt({
    cwd: process.cwd(),
    datetime: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    tools: toolRegistry.list(),
    projectInstructions: projectInstructions,
});
depsAgent.addMessage(createSystemMessage(systemPrompt));


type MessageProps = {
    message: string;
    color: string;
}

function TokenWarningDialog({message, color}: MessageProps) {
    return (
        <Box>
            <Text color={color}>
                {message}
            </Text>
        </Box>
    )
}

function Spinner({message, color}: MessageProps) {
    const icons = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
    const [id,setId] = useState(0);
    const elapsed = useElapsedTime();
    useEffect(() => {
        const timer = setInterval(() => {
            setId(prev => (prev + 1) % icons.length);
        },100)

        return () => clearInterval(timer);
    },[]);

    return (
        <Box>
            <Text color={color}>
                {icons[id]} {message} ({elapsed}s)
            </Text>
        </Box>
    )
}


type ConfirmDialogProps = {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

function ConfirmDialog({message, onConfirm, onCancel} : ConfirmDialogProps) {
    useInput((input, key) => {
        if (input === 'y' || key.return || input === "Y") {
            onConfirm();
        } else if (input === 'n' || key.escape || input === "N") {
            onCancel();
        }
    });

    return (
        <Box borderStyle="round" borderColor="yellow" padding={1}>
            <Text color="yellow">{message} </Text>
            <Text color="gray">(Y/n)</Text>
        </Box>
    )
}


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


            if (commandRegistry.isCommand(currentInput)) {
                const parsed = commandRegistry.parse(currentInput);
                if (parsed) {
                    const command = commandRegistry.get(parsed.name);
                    if (command) {
                        // 执行命令，传入 depsAgent
                        (async () => {
                            const result = await command.execute(parsed.args, depsAgent);
                            appStore.set(prev => ({
                                ...prev,
                                messages: [
                                    ...prev.messages,
                                    { role: 'user' as const, text: currentInput },
                                    { role: 'assistant' as const, text: result }
                                ],
                                inputValue: ""
                            }));
                        })();
                        return;
                    }
                }
            }

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

    const {pendingConfirmation, currentStatus, showTokenWarning} = useAppState();

    return (
        <Box flexDirection='column'>
            <Text>my-agent</Text>
            <Text>------------------------</Text>
            <MessageList />

            {
                pendingConfirmation && (
                    <ConfirmDialog
                        message={pendingConfirmation.message}
                        onConfirm={pendingConfirmation.onConfirm}
                        onCancel={pendingConfirmation.onCancel}
                    />
                )
            }

            {
                currentStatus && (
                    <Spinner message={currentStatus} color="cyan" />
                )
            }

            <Text>------------------------</Text>

            {
                showTokenWarning && (
                    <TokenWarningDialog message='当前上下文占用过多，即将进行上下文压缩' color='cyan'></TokenWarningDialog>
                )
            }

            <StatusBar />
        </Box>
    );
}

render(<App tool_names={tool_names}/>);