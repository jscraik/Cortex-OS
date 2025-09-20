// Local shim re-exporting required schemas to avoid rootDir issues in isolated a2a tests.
// Include a2a-mcp contracts and evidence schemas used by a2a-contracts envelope helpers.
export * from '../../../libs/typescript/contracts/src/a2a-mcp.js';
export * from '../../../libs/typescript/contracts/src/evidence.js';

