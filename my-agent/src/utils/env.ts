import { printError } from "./print";

function requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        printError(`Environment variable ${key} is required but not set.`);
        return ""; // 这行实际上永远不会被执行，因为 printError 会调用 process.exit(1)，但 TypeScript 需要一个返回值
    }
    return value;
}

function optionalEnv(key: string): string | undefined {
    return process.env[key];
}

export { requireEnv, optionalEnv };