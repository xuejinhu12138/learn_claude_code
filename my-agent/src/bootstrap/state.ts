// 全局进程状态
import { z } from "zod";

const AppStateSchema = z.object({
    cwd: z.string(),
    sessionId: z.string(),
    startedAt: z.number(),
    debug: z.boolean(),
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
        debug: debug ?? false
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