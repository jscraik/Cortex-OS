export async function fetchWithTimeout(
        url: string,
        options: RequestInit,
        timeoutMs = 10000,
): Promise<Response> {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        try {
                return await fetch(url, { ...options, signal: controller.signal });
        } catch (error) {
                if ((error as Error).name === "AbortError") {
                        throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
                }
                throw error;
        } finally {
                clearTimeout(id);
        }
}
