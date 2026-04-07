async function withRetry<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
): Promise<T> {
    let attempt = 0;
    while (attempt < retries) {
        try {
            return await fn();
        } catch (error) {
            attempt++;
            if (attempt >= retries) {
                throw error;
            }
            await new Promise(r => setTimeout(r, delay * (2 ** (attempt - 1)) ));
        }
    }
    throw new Error("Unexpected error in withRetry");
}

export { withRetry };   