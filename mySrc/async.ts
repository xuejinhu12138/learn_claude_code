export {};

async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchMockMessage(id: number): Promise<string> {
    await delay(1000);
    if (id === 0){
        throw new Error("Message not found");
    }else {
        return `Message #${id}`;
    }
}

async function fetchMultiple(ids: number[]): Promise<string[]> {
    let results: string[] = [];
    results = await Promise.all(ids.map(id => fetchMockMessage(id)));
    return results;
}

// 测试正常情况
try {
    const a = await fetchMultiple([1, 2, 3]);
    console.log("成功:", a);
} catch (error) {
    if (error instanceof Error) console.error("失败:", error.message);
}

// 测试错误情况
try {
    const b = await fetchMultiple([0, 1]);
    console.log("成功:", b);
} catch (error) {
    if (error instanceof Error) console.error("失败:", error.message);
}

