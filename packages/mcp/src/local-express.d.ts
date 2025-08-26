// Minimal express types for local workspace build only
declare module "express-serve-static-core" {
  export interface Request {
    body?: any;
    url?: string;
  }
  export interface Response {
    status(code: number): this;
    json(obj: any): this;
  }
}

declare module "express" {
    function express(): any;
  namespace express {
    export type Application = any;
  }
  export default express;
}
