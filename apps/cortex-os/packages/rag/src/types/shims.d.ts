declare module "@grpc/grpc-js" {
  export type ClientOptions = any;
  export type ClientUnaryCall = { deadline?: number } & any;
  export type requestCallback<T> = (err: any, res: T) => void;
  export type status = number;
  export const credentials: { createInsecure(): any };
  export const status: any;
  export function loadPackageDefinition(def: any): any;
  export function getClientChannel(client: any): { close(): void };
}

declare module "@grpc/proto-loader" {
  export function loadSync(path: string, options?: any): any;
}
