import { getState } from "../bootstrap/state";

function print(message: string): void {
    console.log(message);
}
function printError(message: string): void {
    console.error(message);
    process.exit(1);
}

function printWarning(message: string): void {
    console.warn(message);
}

function printDebug(message: string): void {
    const state = getState();
    if (state.debug) {
        process.stderr.write(`[DEBUG] ${message}\n`);
    }
}

export { print, printError, printDebug, printWarning };