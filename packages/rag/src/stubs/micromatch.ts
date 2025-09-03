// Type-only stub for micromatch
type IsMatch = (str: string, patterns: string | string[], options?: Record<string, unknown>) => boolean;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const real: { isMatch: IsMatch } = require("micromatch");
export const isMatch: IsMatch = real.isMatch;
export default { isMatch };
