import { createRequire } from 'node:module';
const requirePrisma = createRequire(import.meta.url);
const { GraphEdgeType, GraphNodeType } = requirePrisma('@prisma/client');
export { GraphEdgeType, GraphNodeType };
