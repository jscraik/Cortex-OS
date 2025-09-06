import { Readable } from "node:stream";
import type { TaskManager, TaskResult } from "./task-manager.js";

/**
 * Create a Server-Sent Events stream from TaskManager events.
 */
export function createTaskEventStream(taskManager: TaskManager): Readable {
        const stream = new Readable({
                read() {},
        });

        const writeEvent = (event: string, data: unknown) => {
                stream.push(`event: ${event}\n`);
                stream.push(`data: ${JSON.stringify(data)}\n\n`);
        };

        const onCompleted = (result: TaskResult) => writeEvent("taskCompleted", result);
        const onCancelled = (payload: { id: string }) => writeEvent("taskCancelled", payload);
        const onFailed = (payload: { id: string; error: unknown }) => writeEvent("taskFailed", payload);

        taskManager.on("taskCompleted", onCompleted);
        taskManager.on("taskCancelled", onCancelled);
        taskManager.on("taskFailed", onFailed);

        stream.on("close", () => {
                taskManager.off("taskCompleted", onCompleted);
                taskManager.off("taskCancelled", onCancelled);
                taskManager.off("taskFailed", onFailed);
        });

        // Initial comment to keep connection alive
        stream.push(": connected\n\n");

        return stream;
}
