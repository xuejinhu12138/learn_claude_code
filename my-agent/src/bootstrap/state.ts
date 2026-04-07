// 全局进程状态
import { z } from "zod";
import { requireEnv } from "../utils/env";
import { ANTHROPIC_API_KEY, API_BASE_URL } from "../constants";

const AppStateSchema = z.object({
    cwd: z.string(),
    sessionId: z.string(),
    startedAt: z.number(),
    debug: z.boolean(),
    apiKey: z.string(),
    // baseUrl: z.string(),
})

type AppState = z.infer<typeof AppStateSchema>;

let state: AppState | null = null;

function initState(debug?: boolean): AppState {
    if (state) {
        throw new Error("State has already been initialized");
    }
    state = {
        cwd: process.cwd(),
        sessionId: crypto.randomUUID(),
        startedAt: Date.now(),
        debug: debug ?? false,
        apiKey: requireEnv(ANTHROPIC_API_KEY),
        // baseUrl: requireEnv(API_BASE_URL),
    }
    return state;
}

function getState(): AppState {
    if (!state) {
        throw new Error("State has not been initialized");
    }
    return state;
}

export { initState, getState, AppStateSchema };
export type { AppState };