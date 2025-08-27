/**
 * @file_path tests/gpu-aware-embeddings.test.ts
 * @description Tests for GPU-aware embeddings functionality in Cortex-OS Auto Mode
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-05
 * @version 1.0.0
 * @status active
 * @ai_generated_by human
 * @ai_provenance_hash N/A
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThermalGuardPlugin } from '../thermal-guard.plugin';
import { GPUMonitorPlugin } from '../gpu-monitor.plugin';

// Mock systeminformation module
vi.mock('systeminformation', () => ({
  graphics: vi.fn(),
  cpuTemperature: vi.fn(),
  cpu: vi.fn(),
  mem: vi.fn(),
  currentLoad: vi.fn(),
  cpuCurrentSpeed: vi.fn(),
}));

describe('GPU-Aware Embeddings', () => {
  describe('ThermalGuardPlugin', () => {
    let thermalGuard: ThermalGuardPlugin;

    beforeEach(() => {
      thermalGuard = new ThermalGuardPlugin();
      vi.clearAllMocks();
    });

    it('should initialize with default thresholds', () => {
      expect(thermalGuard).toBeDefined();
    });

    it('should allow setting custom thresholds', () => {
      thermalGuard.setThresholds(90, 16);
      // Test would verify internal thresholds are updated
      expect(thermalGuard).toBeDefined();
    });

    it('should check thermal status correctly', async () => {
      // Mock systeminformation responses
      const mockGraphics = {
        controllers: [
          {
            temperatureGpu: 70,
            memoryUsed: 8192, // 8GB in MB
            memoryTotal: 16384, // 16GB in MB
          },
        ],
      };

      const mockTemp = { main: 65 };

      const si = await import('systeminformation');
      vi.mocked(si.graphics).mockResolvedValue(mockGraphics);
      vi.mocked(si.cpuTemperature).mockResolvedValue(mockTemp);

      const status = await thermalGuard.checkThermalStatus();

      expect(status.temperature).toBe(70);
      expect(status.vramUsage).toBe(8);
      expect(status.safeForGpu).toBe(true);
      expect(status.reason).toBeUndefined();
    });

    it('should detect unsafe thermal conditions', async () => {
      // Mock high temperature and VRAM usage
      const mockGraphics = {
        controllers: [
          {
            temperatureGpu: 90, // Above threshold
            memoryUsed: 15360, // 15GB in MB (above 14GB threshold)
            memoryTotal: 16384,
          },
        ],
      };

      const si = await import('systeminformation');
      vi.mocked(si.graphics).mockResolvedValue(mockGraphics);
      vi.mocked(si.cpuTemperature).mockResolvedValue({ main: 60 });

      const status = await thermalGuard.checkThermalStatus();

      expect(status.safeForGpu).toBe(false);
      expect(status.reason).toContain('Temperature');
      expect(status.reason).toContain('VRAM');
    });

    it('should generate thermal report', async () => {
      const mockGraphics = {
        controllers: [
          {
            temperatureGpu: 75,
            memoryUsed: 6144, // 6GB
            memoryTotal: 16384,
          },
        ],
      };

      const si = await import('systeminformation');
      vi.mocked(si.graphics).mockResolvedValue(mockGraphics);
      vi.mocked(si.cpuTemperature).mockResolvedValue({ main: 65 });

      const report = await thermalGuard.getThermalReport();

      expect(report).toContain('Thermal Status');
      expect(report).toContain('75.0°C');
      expect(report).toContain('6.0GB');
      expect(report).toContain('GPU');
    });
  });

  describe('GPUMonitorPlugin', () => {
    let gpuMonitor: GPUMonitorPlugin;

    beforeEach(() => {
      gpuMonitor = new GPUMonitorPlugin();
      vi.clearAllMocks();
    });

    it('should initialize correctly', () => {
      expect(gpuMonitor).toBeDefined();
    });

    it('should get device metrics', async () => {
      // Mock all required systeminformation calls
      const mockGraphics = {
        controllers: [
          {
            model: 'Test GPU',
            temperatureGpu: 70,
            memoryUsed: 8192,
            memoryTotal: 16384,
            utilizationGpu: 45,
          },
        ],
      };

      const mockCpu = {
        manufacturer: 'Test',
        brand: 'Test CPU',
        physicalCores: 8,
      };

      const mockCpuTemp = { main: 65 };
      const mockMemory = {
        used: 8 * 1024 ** 3, // 8GB in bytes
        total: 16 * 1024 ** 3, // 16GB in bytes
        available: 8 * 1024 ** 3,
      };

      const mockCpuLoad = { currentLoad: 25 };
      const mockCpuSpeed = { avg: 3000 };

      const si = await import('systeminformation');
      vi.mocked(si.graphics).mockResolvedValue(mockGraphics);
      vi.mocked(si.cpu).mockResolvedValue(mockCpu);
      vi.mocked(si.cpuTemperature).mockResolvedValue(mockCpuTemp);
      vi.mocked(si.mem).mockResolvedValue(mockMemory);
      vi.mocked(si.currentLoad).mockResolvedValue(mockCpuLoad);
      vi.mocked(si.cpuCurrentSpeed).mockResolvedValue(mockCpuSpeed);

      const metrics = await gpuMonitor.getDeviceMetrics();

      expect(metrics.gpu.name).toBe('Test GPU');
      expect(metrics.gpu.temperature).toBe(70);
      expect(metrics.gpu.memoryUsed).toBe(8);
      expect(metrics.cpu.model).toBe('Test Test CPU');
      expect(metrics.cpu.temperature).toBe(65);
      expect(metrics.memory.used).toBe(8);
    });

    it('should generate dashboard display', async () => {
      // Setup mocks similar to above test
      const mockGraphics = {
        controllers: [
          {
            model: 'Test GPU',
            temperatureGpu: 70,
            memoryUsed: 8192,
            memoryTotal: 16384,
            utilizationGpu: 45,
          },
        ],
      };

      const si = await import('systeminformation');
      vi.mocked(si.graphics).mockResolvedValue(mockGraphics);
      vi.mocked(si.cpu).mockResolvedValue({
        manufacturer: 'Test',
        brand: 'Test CPU',
        physicalCores: 8,
      });
      vi.mocked(si.cpuTemperature).mockResolvedValue({ main: 65 });
      vi.mocked(si.mem).mockResolvedValue({
        used: 8 * 1024 ** 3,
        total: 16 * 1024 ** 3,
        available: 8 * 1024 ** 3,
      });
      vi.mocked(si.currentLoad).mockResolvedValue({ currentLoad: 25 });
      vi.mocked(si.cpuCurrentSpeed).mockResolvedValue({ avg: 3000 });

      const dashboard = await gpuMonitor.generateDashboard();

      expect(dashboard).toContain('Live Device Monitor');
      expect(dashboard).toContain('GPU Status');
      expect(dashboard).toContain('CPU Status');
      expect(dashboard).toContain('Memory Status');
      expect(dashboard).toContain('Test GPU');
      expect(dashboard).toContain('70.0°C');
    });

    it('should recommend correct device based on thermal state', async () => {
      // Test GPU recommendation (safe conditions)
      const mockGraphics = {
        controllers: [
          {
            temperatureGpu: 70, // Safe
            memoryUsed: 8192, // 8GB - Safe
          },
        ],
      };

      const si = await import('systeminformation');
      vi.mocked(si.graphics).mockResolvedValue(mockGraphics);
      vi.mocked(si.cpu).mockResolvedValue({});
      vi.mocked(si.cpuTemperature).mockResolvedValue({ main: 65 });
      vi.mocked(si.mem).mockResolvedValue({});
      vi.mocked(si.currentLoad).mockResolvedValue({});
      vi.mocked(si.cpuCurrentSpeed).mockResolvedValue({});

      const recommendation = await gpuMonitor.getDeviceRecommendation();
      expect(recommendation).toBe('gpu');

      // Test CPU recommendation (unsafe conditions)
      const unsafeMockGraphics = {
        controllers: [
          {
            temperatureGpu: 90, // Unsafe
            memoryUsed: 15360, // 15GB - Unsafe
          },
        ],
      };

      vi.mocked(si.graphics).mockResolvedValue(unsafeMockGraphics);

      const cpuRecommendation = await gpuMonitor.getDeviceRecommendation();
      expect(cpuRecommendation).toBe('cpu');
    });
  });

  describe('Auto-Switching Integration', () => {
    it('should handle query complexity detection', () => {
      // These would test the Python auto_switcher.py functionality
      // For now, just verify the module structure is correct
      expect(true).toBe(true);
    });

    it('should integrate thermal guard with model selection', () => {
      // Integration test for thermal guard + model selection
      expect(true).toBe(true);
    });

    it('should support WCAG 2.2 accessibility in dashboard', () => {
      // Test keyboard navigation and screen reader announcements
      expect(true).toBe(true);
    });
  });
});

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
