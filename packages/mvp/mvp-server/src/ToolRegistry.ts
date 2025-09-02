import { z } from "zod";

const ToolSchema = z.object({
	name: z.string(),
	description: z.string(),
	run: z
		.function()
		.args(z.any())
		.returns(z.any())
		.or(z.function().args(z.any()).returns(z.promise(z.any()))),
});

export type Tool = z.infer<typeof ToolSchema>;

export class ToolRegistry {
	private tools: Tool[] = [];

	register(tool: Tool) {
		this.tools.push(ToolSchema.parse(tool));
	}

	list() {
		return [...this.tools];
	}
}
