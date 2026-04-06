interface ToolConfig {
    name: string;
    description: string;
    enabled: boolean;
    timeout: number;
}

type ToolConfigDraft = Partial<ToolConfig>;
type ToolPublicInfo = Pick<ToolConfig, "name" | "description">;
type ToolConfigWithoutTimeout = Omit<ToolConfig, "timeout">;

type ToolRegistry = Record<string, ToolConfig>;

function mergeConfig(base: ToolConfig, override: ToolConfigDraft): ToolConfig {
    // return { ...base, ...override }  // spread 展开，override 覆盖 base 的同名字段 , 如果 override 中的字段值为 undefined，则会覆盖 base 中的值，导致结果中的字段值为 undefined

    // 防止 override 中的 undefined 覆盖 base 中的值，我们需要过滤掉 override 中值为 undefined 的字段
    const filtered = Object.fromEntries(
        Object.entries(override).filter(([_, value]) => value !== undefined)
    );  
    return { ...base, ...filtered };
}

const test1: ToolConfig = {
    name: "TestTool",
    description: "A tool for testing",
    enabled: true,
    timeout: 5000
};

const test2: ToolConfigDraft = {
    description: "Updated description",
    timeout: undefined
};

const mergedConfig = mergeConfig(test1, test2);
console.log(mergedConfig);