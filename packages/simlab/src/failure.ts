import { Step } from './scenario';

export async function executeStep(step: Step): Promise<Step | null> {
  if (step.failure === 'drop') return null;
  if (step.failure === 'latency') await new Promise(r => setTimeout(r, step.delayMs));
  if (step.failure === 'crash') throw new Error('Injected crash');
  return step;
}
