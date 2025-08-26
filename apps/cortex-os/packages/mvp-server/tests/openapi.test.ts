import { describe, it, expect } from "vitest";
import SwaggerParser from "@apidevtools/swagger-parser";
import { join } from "node:path";

describe.skip("openapi", () => {
  it("schema is valid", async () => {
    const api = await SwaggerParser.validate(join(__dirname, "../openapi.yaml"));
    expect(api.openapi).toMatch(/^3\.0/);
  });
});
