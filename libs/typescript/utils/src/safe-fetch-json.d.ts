import { type SafeFetchOptions } from './safe-fetch.js';
interface SchemaParser<T> {
    parse: (value: unknown) => T;
}
export interface SafeFetchJsonOptions<T> extends SafeFetchOptions {
    accept?: string;
    rejectOnNon2xx?: boolean;
    schema?: SchemaParser<T>;
    userAgent?: string;
    allowEmptyResponse?: boolean;
    emptyResponseValue?: T;
}
export declare function safeFetchJson<T = unknown>(url: string, options?: SafeFetchJsonOptions<T>): Promise<T>;
export {};
