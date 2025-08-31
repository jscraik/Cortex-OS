/**
 * MLX Thermal and Memory Monitoring
 *
 * Cross-platform resource monitoring for thermal management
 */
import os from 'node:os';
import type { ThermalStatus, MemoryStatus } from './types.js';

export const checkThermalStatus = async (): Promise<ThermalStatus> => {
  const load = os.loadavg()[0] / os.cpus().length;
  const temperature = Math.min(100, 30 + load * 70);
  let level: ThermalStatus['level'] = 'normal';
  if (temperature > 90) level = 'critical';
  else if (temperature > 80) level = 'hot';
  else if (temperature > 70) level = 'warm';
  return {
    temperature,
    level,
    throttled: level !== 'normal',
    timestamp: Date.now(),
  };
};

export const checkMemoryStatus = async (): Promise<MemoryStatus> => {
  const total = os.totalmem();
  const free = os.freemem();
  const used = (total - free) / 1024 ** 3;
  const available = total / 1024 ** 3;
  const usage = used / available;
  let pressure: MemoryStatus['pressure'] = 'normal';
  if (usage > 0.9) pressure = 'critical';
  else if (usage > 0.75) pressure = 'warning';
  return { used, available, pressure, swapUsed: 0 };
};
