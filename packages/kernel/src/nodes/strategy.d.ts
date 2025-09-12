import type { PRPState } from '../state.js';
/**
 * Strategy Phase Gates:
 * - ✅ Blueprint linked in PRP doc
 * - ✅ Security baseline (OWASP ASVS L1 + MITRE ATLAS)
 * - ✅ UX sketches accessible (WCAG 2.2 AA)
 * - ✅ Architecture diagram consistent with repo structure
 */
export declare class StrategyNode {
    execute(state: PRPState): Promise<PRPState>;
    private validateSecurityBaseline;
    private validateUXAccessibility;
    private validateArchitecture;
}
//# sourceMappingURL=strategy.d.ts.map