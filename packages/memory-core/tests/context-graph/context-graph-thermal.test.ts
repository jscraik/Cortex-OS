/**
 * Context Graph Thermal Tests - TDD RED Phase
 *
 * These tests define the expected behavior of thermal-aware context operations.
 * All tests should initially FAIL (RED) before implementation.
 *
 * Tests cover:
 * - Thermal constraint enforcement during context operations
 * - Dynamic throttling based on system temperature
 * - Thermal policy integration with context slicing/packing
 * - Performance degradation under thermal stress
 * - Recovery mechanisms when thermal conditions improve
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThermalAwareContextService } from '../../src/context-graph/thermal/ThermalAwareContextService.js';

// Mock thermal monitoring system
vi.mock('../../src/thermal/ThermalMonitor.js');
vi.mock('../../src/thermal/ThermalPolicy.js');

describe('ThermalAwareContextService', () => {
	let thermalContextService: ThermalAwareContextService;
	let mockThermalMonitor: any;
	let mockThermalPolicy: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockThermalMonitor = {
			getCurrentTemperature: vi.fn(),
			getThermalTrend: vi.fn(),
			getThermalZone: vi.fn(),
			startMonitoring: vi.fn(),
			stopMonitoring: vi.fn(),
			onTemperatureChange: vi.fn(),
		};
		mockThermalPolicy = {
			getThermalLimits: vi.fn(),
			shouldThrottle: vi.fn(),
			getThrottlingLevel: vi.fn(),
			getRecommendedLimits: vi.fn(),
			isEmergencyMode: vi.fn(),
		};
		thermalContextService = new ThermalAwareContextService(mockThermalMonitor, mockThermalPolicy);
	});

	describe('thermalAwareSlice', () => {
		it('should perform normal slicing when thermal conditions are optimal', async () => {
			// Given
			const recipe = {
				query: 'test query',
				maxDepth: 3,
				maxNodes: 15,
				allowedEdgeTypes: ['DEPENDS_ON'],
				filters: {},
			};

			const mockThermalState = {
				currentTemp: 65, // Optimal temperature
				trend: 'stable',
				zone: 'optimal',
				critical: false,
			};

			const mockThermalLimits = {
				maxDepth: 3,
				maxNodes: 15,
				maxConcurrentOps: 5,
				throttlingActive: false,
			};

			mockThermalMonitor.getCurrentTemperature.mockResolvedValue(mockThermalState);
			mockThermalPolicy.shouldThrottle.mockResolvedValue(false);
			mockThermalPolicy.getRecommendedLimits.mockResolvedValue(mockThermalLimits);

			// When
			const result = await thermalContextService.thermalAwareSlice(recipe);

			// Then - This should FAIL until implementation
			expect(result).toBeDefined();
			expect(result.thermalStatus).toBeDefined();
			expect(result.thermalStatus.currentTemp).toBe(65);
			expect(result.thermalStatus.zone).toBe('optimal');
			expect(result.thermalStatus.throttlingActive).toBe(false);
			expect(result.subgraph).toBeDefined();
			expect(result.metadata.thermalConstrained).toBe(false);
			expect(result.metadata.brainwavThermalManaged).toBe(true);
		});

		it('should apply moderate throttling when temperature is elevated', async () => {
			// Given
			const recipe = {
				query: 'test query',
				maxDepth: 4,
				maxNodes: 20,
				allowedEdgeTypes: ['DEPENDS_ON'],
				filters: {},
			};

			const mockThermalState = {
				currentTemp: 82, // Elevated temperature
				trend: 'rising',
				zone: 'elevated',
				critical: false,
			};

			const mockThermalLimits = {
				maxDepth: 2, // Reduced from 4
				maxNodes: 8, // Reduced from 20
				maxConcurrentOps: 2,
				throttlingActive: true,
				throttlingLevel: 'moderate',
			};

			mockThermalMonitor.getCurrentTemperature.mockResolvedValue(mockThermalState);
			mockThermalPolicy.shouldThrottle.mockResolvedValue(true);
			mockThermalPolicy.getThrottlingLevel.mockResolvedValue('moderate');
			mockThermalPolicy.getRecommendedLimits.mockResolvedValue(mockThermalLimits);

			// When
			const result = await thermalContextService.thermalAwareSlice(recipe);

			// Then - This should FAIL until implementation
			expect(result.thermalStatus.zone).toBe('elevated');
			expect(result.thermalStatus.throttlingActive).toBe(true);
			expect(result.thermalStatus.throttlingLevel).toBe('moderate');
			expect(result.metadata.thermalConstrained).toBe(true);
			expect(result.metadata.depthReduced).toBe(true);
			expect(result.metadata.nodesReduced).toBe(true);
			expect(result.subgraph.metadata.maxDepthUsed).toBeLessThanOrEqual(2);
			expect(result.subgraph.metadata.maxNodesUsed).toBeLessThanOrEqual(8);
		});

		it('should apply aggressive throttling when temperature is critical', async () => {
			// Given
			const recipe = {
				query: 'test query',
				maxDepth: 5,
				maxNodes: 30,
				allowedEdgeTypes: ['DEPENDS_ON'],
				filters: {},
			};

			const mockThermalState = {
				currentTemp: 95, // Critical temperature
				trend: 'rapidly_rising',
				zone: 'critical',
				critical: true,
			};

			const mockThermalLimits = {
				maxDepth: 1, // Severely reduced
				maxNodes: 3, // Severely reduced
				maxConcurrentOps: 1,
				throttlingActive: true,
				throttlingLevel: 'aggressive',
				emergencyMode: true,
			};

			mockThermalMonitor.getCurrentTemperature.mockResolvedValue(mockThermalState);
			mockThermalPolicy.shouldThrottle.mockResolvedValue(true);
			mockThermalPolicy.getThrottlingLevel.mockResolvedValue('aggressive');
			mockThermalPolicy.isEmergencyMode.mockResolvedValue(true);
			mockThermalPolicy.getRecommendedLimits.mockResolvedValue(mockThermalLimits);

			// When
			const result = await thermalContextService.thermalAwareSlice(recipe);

			// Then - This should FAIL until implementation
			expect(result.thermalStatus.zone).toBe('critical');
			expect(result.thermalStatus.emergencyMode).toBe(true);
			expect(result.thermalStatus.throttlingLevel).toBe('aggressive');
			expect(result.metadata.thermalConstrained).toBe(true);
			expect(result.metadata.emergencyThrottling).toBe(true);
			expect(result.subgraph.metadata.maxDepthUsed).toBeLessThanOrEqual(1);
			expect(result.subgraph.metadata.maxNodesUsed).toBeLessThanOrEqual(3);
			expect(result.metadata.brainwavEmergencyMode).toBe(true);
		});

		it('should reject operations when thermal threshold is exceeded', async () => {
			// Given
			const recipe = {
				query: 'test query',
				maxDepth: 3,
				maxNodes: 15,
				allowedEdgeTypes: ['DEPENDS_ON'],
				filters: {},
			};

			const mockThermalState = {
				currentTemp: 105, // Exceeds safe operating temperature
				trend: 'critical',
				zone: 'shutdown',
				critical: true,
			};

			mockThermalMonitor.getCurrentTemperature.mockResolvedValue(mockThermalState);
			mockThermalPolicy.shouldThrottle.mockResolvedValue(true);
			mockThermalPolicy.isEmergencyMode.mockResolvedValue(true);

			// When
			const result = await thermalContextService.thermalAwareSlice(recipe);

			// Then - This should FAIL until implementation
			expect(result.rejected).toBe(true);
			expect(result.reason).toContain('Thermal shutdown threshold exceeded');
			expect(result.thermalStatus.zone).toBe('shutdown');
			expect(result.metadata.thermalShutdown).toBe(true);
			expect(result.metadata.brainwavThermalProtected).toBe(true);
		});

		it('should adapt to thermal trends and predict future constraints', async () => {
			// Given
			const recipe = {
				query: 'test query',
				maxDepth: 3,
				maxNodes: 15,
				allowedEdgeTypes: ['DEPENDS_ON'],
				filters: {},
			};

			const mockThermalState = {
				currentTemp: 75,
				trend: 'rising', // Temperature is increasing
				zone: 'normal',
				critical: false,
				predictedTemp: 85, // Expected to reach higher temp
				predictionWindow: '5min',
			};

			const mockThermalLimits = {
				maxDepth: 2, // Preemptively reduced
				maxNodes: 10, // Preemptively reduced
				maxConcurrentOps: 3,
				throttlingActive: true,
				throttlingLevel: 'proactive',
				reason: 'Predictive throttling due to rising temperature trend',
			};

			mockThermalMonitor.getCurrentTemperature.mockResolvedValue(mockThermalState);
			mockThermalMonitor.getThermalTrend.mockResolvedValue('rising');
			mockThermalPolicy.shouldThrottle.mockResolvedValue(true);
			mockThermalPolicy.getRecommendedLimits.mockResolvedValue(mockThermalLimits);

			// When
			const result = await thermalContextService.thermalAwareSlice(recipe);

			// Then - This should FAIL until implementation
			expect(result.thermalStatus.currentTemp).toBe(75);
			expect(result.thermalStatus.trend).toBe('rising');
			expect(result.thermalStatus.predictedTemp).toBe(85);
			expect(result.metadata.proactiveThrottling).toBe(true);
			expect(result.metadata.throttlingReason).toContain('Predictive throttling');
			expect(result.subgraph.metadata.maxDepthUsed).toBeLessThanOrEqual(2);
		});
	});

	describe('thermalMonitoring', () => {
		it('should monitor temperature during context operations', async () => {
			// Given
			const recipe = {
				query: 'test query',
				maxDepth: 3,
				maxNodes: 15,
				allowedEdgeTypes: ['DEPENDS_ON'],
				filters: {},
			};

			const temperatureReadings = [
				{ temp: 70, timestamp: Date.now() - 100 },
				{ temp: 72, timestamp: Date.now() - 50 },
				{ temp: 74, timestamp: Date.now() },
			];

			mockThermalMonitor.getCurrentTemperature.mockResolvedValue({
				currentTemp: 74,
				trend: 'rising',
				zone: 'normal',
			});
			mockThermalPolicy.shouldThrottle.mockResolvedValue(false);

			// Mock temperature monitoring during operation
			mockThermalMonitor.startMonitoring.mockImplementation((callback) => {
				temperatureReadings.forEach((reading) => callback(reading));
			});

			// When
			const result = await thermalContextService.thermalAwareSlice(recipe);

			// Then - This should FAIL until implementation
			expect(mockThermalMonitor.startMonitoring).toHaveBeenCalled();
			expect(mockThermalMonitor.stopMonitoring).toHaveBeenCalled();
			expect(result.thermalStatus.monitored).toBe(true);
			expect(result.thermalStatus.temperatureReadings).toBeDefined();
			expect(result.thermalStatus.temperatureReadings).toHaveLength(3);
			expect(result.metadata.thermalMonitoringActive).toBe(true);
		});

		it('should detect and respond to rapid temperature changes', async () => {
			// Given
			const recipe = {
				query: 'test query',
				maxDepth: 3,
				maxNodes: 15,
				allowedEdgeTypes: ['DEPENDS_ON'],
				filters: {},
			};

			const rapidIncreaseReadings = [
				{ temp: 70, timestamp: Date.now() - 100 },
				{ temp: 85, timestamp: Date.now() - 50 }, // Rapid increase
				{ temp: 95, timestamp: Date.now() }, // Critical increase
			];

			mockThermalMonitor.getCurrentTemperature.mockResolvedValue({
				currentTemp: 95,
				trend: 'rapidly_rising',
				zone: 'critical',
			});
			mockThermalPolicy.shouldThrottle.mockResolvedValue(true);
			mockThermalPolicy.isEmergencyMode.mockResolvedValue(true);

			// Mock rapid temperature increase
			mockThermalMonitor.startMonitoring.mockImplementation((callback) => {
				rapidIncreaseReadings.forEach((reading) => callback(reading));
			});

			// When
			const result = await thermalContextService.thermalAwareSlice(recipe);

			// Then - This should FAIL until implementation
			expect(result.thermalStatus.rapidIncreaseDetected).toBe(true);
			expect(result.thermalStatus.temperatureIncrease).toBe(25); // 95 - 70
			expect(result.thermalStatus.emergencyTriggered).toBe(true);
			expect(result.metadata.thermalEmergency).toBe(true);
			expect(result.metadata.operationAborted).toBe(true);
		});
	});

	describe('thermalRecovery', () => {
		it('should gradually restore capabilities when temperature decreases', async () => {
			// Given
			const recipe = {
				query: 'test query',
				maxDepth: 3,
				maxNodes: 15,
				allowedEdgeTypes: ['DEPENDS_ON'],
				filters: {},
			};

			const coolingThermalState = {
				currentTemp: 78, // Cooling down from previous high temp
				trend: 'decreasing',
				zone: 'recovering',
				critical: false,
				previousTemp: 92,
				recoveryMode: true,
			};

			const mockThermalLimits = {
				maxDepth: 2, // Still reduced but improving
				maxNodes: 12, // Still reduced but improving
				maxConcurrentOps: 3,
				throttlingActive: true,
				throttlingLevel: 'recovery',
				recoveryMode: true,
			};

			mockThermalMonitor.getCurrentTemperature.mockResolvedValue(coolingThermalState);
			mockThermalPolicy.shouldThrottle.mockResolvedValue(true);
			mockThermalPolicy.getRecommendedLimits.mockResolvedValue(mockThermalLimits);

			// When
			const result = await thermalContextService.thermalAwareSlice(recipe);

			// Then - This should FAIL until implementation
			expect(result.thermalStatus.zone).toBe('recovering');
			expect(result.thermalStatus.trend).toBe('decreasing');
			expect(result.thermalStatus.recoveryMode).toBe(true);
			expect(result.metadata.thermalRecovery).toBe(true);
			expect(result.metadata.capabilitiesRestored).toBe(true);
			expect(result.subgraph.metadata.maxDepthUsed).toBeLessThanOrEqual(2);
			expect(result.subgraph.metadata.maxNodesUsed).toBeLessThanOrEqual(12);
		});

		it('should implement thermal cooldown periods between operations', async () => {
			// Given
			const recipe = {
				query: 'test query',
				maxDepth: 3,
				maxNodes: 15,
				allowedEdgeTypes: ['DEPENDS_ON'],
				filters: {},
			};

			const highTempState = {
				currentTemp: 88,
				trend: 'stable',
				zone: 'elevated',
				critical: false,
				lastOperationTime: Date.now() - 1000,
				cooldownRequired: true,
				cooldownDuration: 5000, // 5 seconds
			};

			mockThermalMonitor.getCurrentTemperature.mockResolvedValue(highTempState);
			mockThermalPolicy.shouldThrottle.mockResolvedValue(true);

			// When
			const result = await thermalContextService.thermalAwareSlice(recipe);

			// Then - This should FAIL until implementation
			expect(result.thermalStatus.cooldownRequired).toBe(true);
			expect(result.thermalStatus.cooldownDuration).toBe(5000);
			expect(result.metadata.cooldownEnforced).toBe(true);
			expect(result.metadata.operationDelayed).toBe(true);
			expect(result.metadata.thermalCooldownActive).toBe(true);
		});
	});

	describe('thermalAnalytics', () => {
		it('should track thermal performance metrics', async () => {
			// Given
			const recipe = {
				query: 'test query',
				maxDepth: 3,
				maxNodes: 15,
				allowedEdgeTypes: ['DEPENDS_ON'],
				filters: {},
			};

			const mockThermalState = {
				currentTemp: 75,
				trend: 'stable',
				zone: 'normal',
				critical: false,
			};

			mockThermalMonitor.getCurrentTemperature.mockResolvedValue(mockThermalState);
			mockThermalPolicy.shouldThrottle.mockResolvedValue(false);

			// When
			const result = await thermalContextService.thermalAwareSlice(recipe);

			// Then - This should FAIL until implementation
			expect(result.thermalAnalytics).toBeDefined();
			expect(result.thermalAnalytics.operationTempStart).toBeDefined();
			expect(result.thermalAnalytics.operationTempEnd).toBeDefined();
			expect(result.thermalAnalytics.tempDelta).toBeDefined();
			expect(result.thermalAnalytics.thermalEfficiency).toBeDefined();
			expect(result.thermalAnalytics.brainwavThermalMetrics).toBe(true);
		});

		it('should provide thermal recommendations for optimization', async () => {
			// Given
			const recipe = {
				query: 'test query',
				maxDepth: 3,
				maxNodes: 15,
				allowedEdgeTypes: ['DEPENDS_ON'],
				filters: {},
			};

			const mockThermalState = {
				currentTemp: 85,
				trend: 'rising',
				zone: 'elevated',
				critical: false,
			};

			mockThermalMonitor.getCurrentTemperature.mockResolvedValue(mockThermalState);
			mockThermalPolicy.shouldThrottle.mockResolvedValue(true);
			mockThermalPolicy.getRecommendedLimits.mockResolvedValue({
				maxDepth: 2,
				maxNodes: 8,
				recommendations: [
					'Reduce concurrent operations',
					'Increase cooldown periods',
					'Consider workload distribution',
				],
			});

			// When
			const result = await thermalContextService.thermalAwareSlice(recipe);

			// Then - This should FAIL until implementation
			expect(result.thermalRecommendations).toBeDefined();
			expect(result.thermalRecommendations).toContain('Reduce concurrent operations');
			expect(result.thermalRecommendations).toContain('Increase cooldown periods');
			expect(result.metadata.thermalOptimizationProvided).toBe(true);
			expect(result.metadata.brainwavThermalOptimized).toBe(true);
		});
	});

	describe('performance', () => {
		it('should complete thermal-aware slicing within performance targets', async () => {
			// Given
			const recipe = {
				query: 'test query',
				maxDepth: 3,
				maxNodes: 15,
				allowedEdgeTypes: ['DEPENDS_ON'],
				filters: {},
			};

			const mockThermalState = {
				currentTemp: 70,
				trend: 'stable',
				zone: 'normal',
				critical: false,
			};

			mockThermalMonitor.getCurrentTemperature.mockResolvedValue(mockThermalState);
			mockThermalPolicy.shouldThrottle.mockResolvedValue(false);

			const startTime = Date.now();

			// When
			await thermalContextService.thermalAwareSlice(recipe);

			const duration = Date.now() - startTime;

			// Then - This should FAIL until implementation
			expect(duration).toBeLessThan(200); // Performance target: <200ms (higher due to thermal monitoring)
		});
	});
});
