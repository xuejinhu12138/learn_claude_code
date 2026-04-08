import { printError, printWarning } from "./print";
import type { Message } from "../types";
import { estimateHistoryTokens } from "./tokenEstimation";


class CompactWarningChecker {
    private warningThreshold: number;
    private warningIssued: boolean = false;
    private onWarn: (content: string) => void;

    constructor(warningThreshold: number, onWarn: (content: string) => void) {
        this.warningThreshold = warningThreshold;
        this.onWarn = onWarn;
    }

    check(messages: Message[]): void {
        const tokenCount = estimateHistoryTokens(messages);
        if (tokenCount > this.warningThreshold && !this.warningIssued) {
            this.onWarn("消息数量超过警告阈值");
            this.warningIssued = true;
        }
    }

    reset(): void {
        this.warningIssued = false;
    }
}

function createCompactWarning(warningThreshold: number, onWarn: (content: string) => void): CompactWarningChecker {
    return new CompactWarningChecker(warningThreshold, onWarn);
}

export { createCompactWarning };