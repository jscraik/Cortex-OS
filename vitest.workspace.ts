import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'apps/cortex-os',
  'packages/*',
  'libs/typescript/*',
  'tools/structure-guard',
])
