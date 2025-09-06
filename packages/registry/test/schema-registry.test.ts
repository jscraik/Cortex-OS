import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import { SchemaRegistry } from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("SchemaRegistry", () => {
  let app: any;
  const category = "events";
  const runtimeFile = path.join(
    __dirname,
    "fixtures",
    "contracts",
    category,
    "runtime-test@1.0.0.json"
  );

  beforeAll(() => {
    const registry = new SchemaRegistry({
      port: 0,
      contractsPath: path.join(__dirname, "fixtures", "contracts"),
    });
    app = registry.getApp();
  });

  afterAll(async () => {
    await fs.rm(runtimeFile, { force: true });
  });

  it("registers and retrieves schema with version and hash", async () => {
    const schema = {
      $id: "runtime-test",
      title: "Runtime test",
      description: "runtime schema",
      type: "object",
      properties: { foo: { type: "string" } },
      required: ["foo"],
    };
    const registerRes = await request(app)
      .post("/schemas")
      .send({ category, version: "1.0.0", schema })
      .expect(201);

    expect(registerRes.body).toMatchObject({
      schemaId: "runtime-test",
      version: "1.0.0",
      hash: expect.any(String),
    });

    const getRes = await request(app)
      .get("/schemas/runtime-test?version=1.0.0")
      .expect(200);

    expect(getRes.body).toMatchObject({
      schemaId: "runtime-test",
      version: "1.0.0",
      hash: registerRes.body.hash,
    });
  });

  it("validates event against versioned schema", async () => {
    const event = { foo: "bar" };
    const res = await request(app)
      .post("/validate/runtime-test?version=1.0.0")
      .send(event)
      .expect(200);
    expect(res.body).toMatchObject({
      valid: true,
      schemaId: "runtime-test",
      version: "1.0.0",
    });
  });
});

