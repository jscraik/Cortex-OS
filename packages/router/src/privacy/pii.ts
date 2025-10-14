import type { RouterConfig } from "../schemas";

type Action = RouterConfig["routing"]["privacy"]["actions"][number];

const maskValue = (valueLength: number) => "[redacted]".repeat(Math.max(1, Math.ceil(valueLength / 9)));

function applyMask(input: string, fields: string[]): string {
  let result = input;
  for (const field of fields) {
    const pattern = new RegExp(`(${field})\\s*[:=]\\s*(\\S+)`, "gi");
    result = result.replace(pattern, (_match, key, value: string) => `${key}: ${maskValue(value.length)}`);
  }
  return result;
}

export async function piiScrub(input: string, cfg: RouterConfig): Promise<string> {
  let output = input;
  for (const action of cfg.routing.privacy.actions as Action[]) {
    if (action.type === "mask") {
      output = applyMask(output, action.fields);
    }
    if (action.type === "drop") {
      const pattern = new RegExp(action.fields.join("|"), "gi");
      output = output.replace(pattern, "");
    }
  }
  return output;
}
