import type { PRPState } from '../state.js';
/**
 * Build Phase Gates:
 * - ✅ Backend passes compilation + tests
 * - ✅ API schema validated (OpenAPI/JSON Schema)
 * - ✅ Security scanner (CodeQL, Semgrep) ≤ agreed majors
 * - ✅ Frontend Lighthouse/Axe ≥ 90%
 * - ✅ Docs complete with API + usage notes
 */
export declare class BuildNode {
    execute(state: PRPState): Promise<PRPState>;
    private validateBackend;
    private validateAPISchema;
    private runSecurityScan;
    private validateFrontend;
    private validateDocumentation;
}
//# sourceMappingURL=build.d.ts.map