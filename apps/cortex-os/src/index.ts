import { startRuntime } from './runtime';

startRuntime().then(() => console.log('Cortex-OS runtime started')).catch((e) => {
  console.error('Runtime failed', e);
  process.exit(1);
});
