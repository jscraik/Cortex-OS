/**
 * Thermal Monitor for brAInwav Cortex-OS
 *
 * Implements thermal monitoring and constraint enforcement for context operations.
 * Prevents system overload by monitoring temperature and applying throttling.
 *
 * Key Features:
 * - Real-time temperature monitoring
 * - Predictive thermal analysis
 * - Adaptive throttling based on thermal state
 * - Emergency shutdown protection
 * - Performance optimization under thermal constraints
 */

export interface ThermalState {
	currentTemp: number;
	trend: 'stable' | 'rising' | 'decreasing' | 'rapidly_rising' | 'critical';
	zone: 'optimal' | 'normal' | 'elevated' | 'critical' | 'shutdown';
	critical: boolean;
	predictedTemp?: number;
	predictionWindow?: string;
	previousTemp?: number;
	lastOperationTime?: number;
	cooldownRequired?: boolean;
	cooldownDuration?: number;
	recoveryMode?: boolean;
	emergencyMode?: boolean;
}

export interface ThermalLimits {
	maxDepth: number;
	maxNodes: number;
	maxConcurrentOps: number;
	throttlingActive: boolean;
	throttlingLevel: 'none' | 'proactive' | 'moderate' | 'aggressive' | 'emergency';
	reason?: string;
	recoveryMode?: boolean;
	emergencyMode?: boolean;
	recommendations?: string[];
}

export interface ThermalConstraints {
	currentTemp: number;
	trend: string;
	zone: string;
	critical: boolean;
	throttlingActive: boolean;
	throttlingLevel?: string;
	monitored?: boolean;
	temperatureReadings?: Array<{
		temp: number;
		timestamp: number;
	}>;
	predictedTemp?: number;
	rapidIncreaseDetected?: boolean;
	temperatureIncrease?: number;
	emergencyTriggered?: boolean;
	thermalEmergency?: boolean;
	operationAborted?: boolean;
}

export interface ThermalAnalytics {
	operationTempStart: number;
	operationTempEnd: number;
	tempDelta: number;
	thermalEfficiency: number;
	brainwavThermalMetrics: boolean;
}

export interface ThermalRecommendations {
	reduceConcurrentOps?: boolean;
	increaseCooldownPeriods?: boolean;
	workloadDistribution?: boolean;
	emergencyCooldown?: boolean;
	systemRestart?: boolean;
}

export class ThermalMonitor {
	private temperatureHistory: Array<{ temp: number; timestamp: number }> = [];
	private isMonitoring = false;
	private monitoringCallback?: (reading: { temp: number; timestamp: number }) => void;

	async getCurrentTemperature(): Promise<ThermalState> {
		// Simulate thermal monitoring - in real implementation, this would read from hardware sensors
		const baseTemp = 65; // Base temperature
		const variation = Math.sin(Date.now() / 10000) * 10; // Simulate temperature variation
		const currentTemp = baseTemp + variation + Math.random() * 5;

		const trend = this.calculateTrend(currentTemp);
		const zone = this.determineThermalZone(currentTemp);
		const critical = zone === 'critical' || zone === 'shutdown';

		const previousTemp =
			this.temperatureHistory.length > 0
				? this.temperatureHistory[this.temperatureHistory.length - 1].temp
				: currentTemp;

		const predictedTemp = this.predictTemperature(currentTemp, trend);

		return {
			currentTemp: Math.round(currentTemp),
			trend,
			zone,
			critical,
			predictedTemp: Math.round(predictedTemp),
			predictionWindow: '5min',
			previousTemp: Math.round(previousTemp),
			lastOperationTime: Date.now(),
			cooldownRequired: currentTemp > 80,
			cooldownDuration: currentTemp > 80 ? Math.round((currentTemp - 80) * 100) : 0,
			recoveryMode: trend === 'decreasing' && currentTemp > 70,
			emergencyMode: critical,
		};
	}

	getThermalTrend(): string {
		if (this.temperatureHistory.length < 2) return 'stable';

		const recent = this.temperatureHistory.slice(-5);
		const temps = recent.map((r) => r.temp);
		const avgChange = (temps[temps.length - 1] - temps[0]) / temps.length;

		if (avgChange > 2) return 'rapidly_rising';
		if (avgChange > 0.5) return 'rising';
		if (avgChange < -0.5) return 'decreasing';
		return 'stable';
	}

	getThermalZone(): string {
		const latestTemp =
			this.temperatureHistory.length > 0
				? this.temperatureHistory[this.temperatureHistory.length - 1].temp
				: 65;

		return this.determineThermalZone(latestTemp);
	}

	async getConstraints(): Promise<ThermalLimits> {
		const thermalState = await this.getCurrentTemperature();

		let maxDepth = 5;
		let maxNodes = 50;
		let maxConcurrentOps = 5;
		let throttlingActive = false;
		let throttlingLevel: ThermalLimits['throttlingLevel'] = 'none';
		let reason: string | undefined;
		const recommendations: string[] = [];

		switch (thermalState.zone) {
			case 'optimal':
				// No constraints
				break;

			case 'normal':
				if (thermalState.trend === 'rising') {
					throttlingActive = true;
					throttlingLevel = 'proactive';
					maxDepth = 4;
					maxNodes = 30;
					maxConcurrentOps = 4;
					reason = 'Predictive throttling due to rising temperature trend';
					recommendations.push('Monitor temperature trend');
				}
				break;

			case 'elevated':
				throttlingActive = true;
				throttlingLevel = 'moderate';
				maxDepth = 2;
				maxNodes = 15;
				maxConcurrentOps = 2;
				reason = 'Temperature in elevated zone - applying moderate throttling';
				recommendations.push('Reduce concurrent operations', 'Increase cooldown periods');
				break;

			case 'critical':
				throttlingActive = true;
				throttlingLevel = 'aggressive';
				maxDepth = 1;
				maxNodes = 5;
				maxConcurrentOps = 1;
				reason = 'Critical temperature - aggressive throttling applied';
				recommendations.push('Immediate cooldown required', 'Consider system restart');
				break;

			case 'shutdown':
				// System should not accept operations
				maxDepth = 0;
				maxNodes = 0;
				maxConcurrentOps = 0;
				throttlingActive = true;
				throttlingLevel = 'emergency';
				reason = 'Thermal shutdown threshold exceeded';
				recommendations.push('Emergency shutdown', 'Hardware inspection required');
				break;
		}

		return {
			maxDepth,
			maxNodes,
			maxConcurrentOps,
			throttlingActive,
			throttlingLevel,
			reason,
			recoveryMode: thermalState.recoveryMode || false,
			emergencyMode: thermalState.emergencyMode || false,
			recommendations,
		};
	}

	async shouldThrottle(): Promise<boolean> {
		const constraints = await this.getConstraints();
		return constraints.throttlingActive;
	}

	async getThrottlingLevel(): Promise<string> {
		const constraints = await this.getConstraints();
		return constraints.throttlingLevel;
	}

	async isEmergencyMode(): Promise<boolean> {
		const thermalState = await this.getCurrentTemperature();
		return thermalState.emergencyMode || false;
	}

	startMonitoring(callback: (reading: { temp: number; timestamp: number }) => void): void {
		this.monitoringCallback = callback;
		this.isMonitoring = true;

		// Simulate temperature monitoring
		const interval = setInterval(() => {
			if (!this.isMonitoring) {
				clearInterval(interval);
				return;
			}

			const reading = {
				temp: 65 + Math.sin(Date.now() / 10000) * 10 + Math.random() * 5,
				timestamp: Date.now(),
			};

			this.temperatureHistory.push(reading);

			// Keep only last 100 readings
			if (this.temperatureHistory.length > 100) {
				this.temperatureHistory.shift();
			}

			if (this.monitoringCallback) {
				this.monitoringCallback(reading);
			}
		}, 1000); // Update every second
	}

	stopMonitoring(): void {
		this.isMonitoring = false;
		this.monitoringCallback = undefined;
	}

	onTemperatureChange(callback: (thermalState: ThermalState) => void): void {
		// Simple event listener - in real implementation, this would be more sophisticated
		let lastTemp = 0;

		const _checkInterval = setInterval(() => {
			this.getCurrentTemperature().then((state) => {
				if (Math.abs(state.currentTemp - lastTemp) > 2) {
					callback(state);
					lastTemp = state.currentTemp;
				}
			});
		}, 2000);
	}

	// Helper methods
	private calculateTrend(_currentTemp: number): ThermalState['trend'] {
		if (this.temperatureHistory.length < 2) return 'stable';

		const recent = this.temperatureHistory.slice(-3);
		const temps = recent.map((r) => r.temp);
		const avgChange = (temps[temps.length - 1] - temps[0]) / temps.length;

		if (avgChange > 3) return 'rapidly_rising';
		if (avgChange > 0.5) return 'rising';
		if (avgChange < -0.5) return 'decreasing';
		return 'stable';
	}

	private determineThermalZone(temp: number): ThermalState['zone'] {
		if (temp >= 100) return 'shutdown';
		if (temp >= 90) return 'critical';
		if (temp >= 80) return 'elevated';
		if (temp >= 70) return 'normal';
		return 'optimal';
	}

	private predictTemperature(currentTemp: number, trend: ThermalState['trend']): number {
		let predictedChange = 0;

		switch (trend) {
			case 'rapidly_rising':
				predictedChange = 10;
				break;
			case 'rising':
				predictedChange = 5;
				break;
			case 'stable':
				predictedChange = 0;
				break;
			case 'decreasing':
				predictedChange = -3;
				break;
		}

		return Math.max(0, Math.min(120, currentTemp + predictedChange));
	}
}
