function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function truncate(str: string, maxLen: number): string {
    return str.length <= maxLen ? str : `${str.slice(0, maxLen)}...`;
}

export { clamp, truncate };