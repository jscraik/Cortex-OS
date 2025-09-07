// Type-only stub for micromatch
type IsMatch = (str: string, patterns: string | string[], options?: Record<string, unknown>) => boolean;
 
const real: { isMatch: IsMatch } = require("micromatch");
export const isMatch: IsMatch = real.isMatch;
export default { isMatch };
