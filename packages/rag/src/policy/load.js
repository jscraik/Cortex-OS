import { readFile } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import { ProcessingDispatcher } from "../chunkers/dispatch";
import { MimePolicyEngine } from "./mime";
export async function loadRetrievalPolicy(
	configPath = resolvePath(process.cwd(), "config/retrieval.policy.json"),
	schemaPath = resolvePath(
		process.cwd(),
		"schemas/retrieval.policy.schema.json",
	),
) {
	const [configRaw, schemaRaw] = await Promise.all([
		readFile(configPath, "utf8"),
		readFile(schemaPath, "utf8"),
	]);
	const policyUnknown = JSON.parse(configRaw);
	const schemaUnknown = JSON.parse(schemaRaw);
	const ajv = new Ajv2020({ allErrors: true, strict: false });
	const validate = ajv.compile(schemaUnknown);
	const valid = validate(policyUnknown);
	if (!valid) {
		const msg = ajv.errorsText(validate.errors, { separator: "\n" });
		throw new Error(`Retrieval policy validation failed:\n${msg}`);
	}
	const policy = policyUnknown;
	const engine = new MimePolicyEngine(policy.mimePolicy);
	return { policy, engine };
}
export function applyPolicyOverrides(decision, mimeType, policy) {
	if (!policy.overrides) return decision;
	const normalized = mimeType.split(";")[0].trim().toLowerCase();
	const exact = policy.overrides[normalized];
	const wildcard = (() => {
		const [type] = normalized.split("/");
		return policy.overrides?.[`${type}/*`];
	})();
	const override = exact || wildcard;
	if (!override) return decision;
	if (!decision.processing) return decision;
	const nextProcessing = { ...decision.processing };
	if (override.processing && typeof override.processing === "object") {
		if (Object.hasOwn(override.processing, "maxPages")) {
			nextProcessing.maxPages = override.processing.maxPages ?? null;
		}
	}
	return { ...decision, processing: nextProcessing };
}
export async function planAndDispatch(
	file,
	mimeType,
	engine,
	dispatcher,
	policy,
) {
	let decision = engine.parseStrategy(mimeType, { fileSize: file.size });
	if (policy) {
		decision = applyPolicyOverrides(decision, mimeType, policy);
	}
	return dispatcher.dispatch(file, decision);
}
export function createDispatcherFromPolicy(policy) {
	if (policy?.dispatcher) {
		const { timeout, maxChunkSize, enableParallel } = policy.dispatcher;
		return new ProcessingDispatcher({
			...(typeof timeout === "number" ? { timeout } : {}),
			...(typeof maxChunkSize === "number" ? { maxChunkSize } : {}),
			...(typeof enableParallel === "boolean" ? { enableParallel } : {}),
		});
	}
	return new ProcessingDispatcher();
}
//# sourceMappingURL=load.js.map
