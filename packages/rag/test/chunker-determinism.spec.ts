import { describe, expect, it } from "vitest";
import {
	ProcessingDispatcher,
	type ProcessingFile,
} from "../src/chunkers/dispatch";
import { ProcessingStrategy } from "../src/policy/mime";

describe("UnstructuredChunker", () => {
	it("produces deterministic chunks", async () => {
		const dispatcher = new ProcessingDispatcher();
		const file: ProcessingFile = {
			path: "file",
			content: Buffer.from("dummy"),
			mimeType: "text/plain",
			size: 5,
		};
		const strategy = {
			strategy: ProcessingStrategy.UNSTRUCTURED,
			confidence: 1,
			reason: "",
			processing: {
				chunker: "unstructured",
				requiresOCR: false,
				requiresUnstructured: true,
				maxPages: 2,
			},
		};
		const res1 = await dispatcher.dispatch(file, strategy);
		const res2 = await dispatcher.dispatch(file, strategy);
		expect(res1.chunks).toEqual(res2.chunks);
	});
});
