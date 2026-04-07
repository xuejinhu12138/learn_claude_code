import { getState } from "../bootstrap/state";

function print(message: string): void {
    console.log(message);
}
function printError(message: string): void {
    console.error(message);
    process.exit(1);
}
function printDebug(message: string): void {
    const state = getState();
    if (state.debug) {
        process.stderr.write(`[DEBUG] ${message}\n`);
    }else{
        print(message);
    }
}

export { print, printError, printDebug };