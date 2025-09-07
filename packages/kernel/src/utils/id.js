import { randomUUID } from "node:crypto";
let counter = 0;
export function resetIdCounter() {
    counter = 0;
}
export function generateId(prefix, deterministic = false) {
    if (deterministic) {
        counter += 1;
        return `${prefix}-${String(counter).padStart(6, "0")}`;
    }
    return `${prefix}-${randomUUID()}`;
}
//# sourceMappingURL=id.js.map