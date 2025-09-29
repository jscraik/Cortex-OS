import { db } from '../db';
import logger from '../utils/logger';
import { externalMonitoringService } from './externalMonitoringService';

interface AuthEvent {
	id: string;
	userId?: string;
	eventType:
		| 'login'
		| 'logout'
		| 'register'
		| 'password_reset'
		| 'email_verified'
		| '2fa_enabled'
		| '2fa_disabled'
		| 'oauth_signin'
		| 'failed_login';
	ipAddress?: string;
	userAgent?: string;
	metadata?: Record<string, unknown>;
	timestamp: Date;
}

interface AuthMetrics {
	totalLogins: number;
	failedLogins: number;
	newRegistrations: number;
	activeUsers: number;
	twoFactorEnabled: number;
	oauthSignins: number;
}

export class AuthMonitoringService {
	private static instance: AuthMonitoringService;
	private readonly metrics: AuthMetrics = {
		totalLogins: 0,
		failedLogins: 0,
		newRegistrations: 0,
		activeUsers: 0,
		twoFactorEnabled: 0,
		oauthSignins: 0,
	};
	private readonly recentEvents: AuthEvent[] = [];
	private readonly maxRecentEvents = 1000;

	private constructor() {
		// Initialize monitoring
		this.startMetricsCollection();
	}

	static getInstance(): AuthMonitoringService {
		if (!AuthMonitoringService.instance) {
			AuthMonitoringService.instance = new AuthMonitoringService();
		}
		return AuthMonitoringService.instance;
	}

	async logEvent(event: Omit<AuthEvent, 'id' | 'timestamp'>): Promise<void> {
		const authEvent: AuthEvent = {
			...event,
			id: this.generateEventId(),
			timestamp: new Date(),
		};

		// Store in memory for quick access
		this.recentEvents.unshift(authEvent);
		if (this.recentEvents.length > this.maxRecentEvents) {
			this.recentEvents.pop();
		}

		// Update metrics
		this.updateMetrics(authEvent);

		// Store in database
		try {
			await db.insert({
				table: 'auth_events',
				values: [authEvent],
			});
		} catch (error) {
			console.error('Failed to store auth event in database:', error);
		}

		// Emit to monitoring systems (non-blocking)
		void this.emitToMonitoringSystems(authEvent);
	}

	async logSuccessfulLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
		await this.logEvent({
			userId,
			eventType: 'login',
			ipAddress,
			userAgent,
		});
	}

	async logFailedLogin(email: string, ipAddress?: string, userAgent?: string): Promise<void> {
		await this.logEvent({
			eventType: 'failed_login',
			ipAddress,
			userAgent,
			metadata: { email },
		});
	}

	async logOAuthSignIn(
		userId: string,
		provider: string,
		ipAddress?: string,
		userAgent?: string,
	): Promise<void> {
		await this.logEvent({
			userId,
			eventType: 'oauth_signin',
			ipAddress,
			userAgent,
			metadata: { provider },
		});
	}

	async logTwoFactorChange(userId: string, enabled: boolean): Promise<void> {
		await this.logEvent({
			userId,
			eventType: enabled ? '2fa_enabled' : '2fa_disabled',
		});
	}

	async getRecentEvents(limit: number = 50): Promise<AuthEvent[]> {
		return this.recentEvents.slice(0, limit);
	}

	async getMetrics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<AuthMetrics> {
		const cutoffTime = this.getTimeRangeCutoff(timeRange);

		// Filter events within time range
		const eventsInRange = this.recentEvents.filter((event) => event.timestamp >= cutoffTime);

		// Calculate metrics
		return {
			totalLogins: eventsInRange.filter((e) => e.eventType === 'login').length,
			failedLogins: eventsInRange.filter((e) => e.eventType === 'failed_login').length,
			newRegistrations: eventsInRange.filter((e) => e.eventType === 'register').length,
			activeUsers: new Set(eventsInRange.filter((e) => e.userId).map((e) => e.userId)).size,
			twoFactorEnabled: eventsInRange.filter((e) => e.eventType === '2fa_enabled').length,
			oauthSignins: eventsInRange.filter((e) => e.eventType === 'oauth_signin').length,
		};
	}

	async getSecurityAlerts(): Promise<
		Array<{
			type: 'suspicious_ip' | 'brute_force' | 'unusual_location';
			message: string;
			severity: 'low' | 'medium' | 'high';
			data: Record<string, unknown>;
		}>
	> {
		const alerts: Array<{
			type: 'suspicious_ip' | 'brute_force' | 'unusual_location';
			message: string;
			severity: 'low' | 'medium' | 'high';
			data: Record<string, unknown>;
		}> = [];

		// Check for suspicious IPs
		const ipCounts = new Map<string, number>();
		this.recentEvents.forEach((event) => {
			if (event.ipAddress) {
				ipCounts.set(event.ipAddress, (ipCounts.get(event.ipAddress) || 0) + 1);
			}
		});

		// Alert on IPs with high failed login attempts
		for (const [ip, count] of ipCounts) {
			if (count > 10) {
				alerts.push({
					type: 'suspicious_ip',
					message: `High activity from IP: ${ip}`,
					severity: 'medium',
					data: { ip, attempts: count },
				});
			}
		}

		// Check for brute force attempts
		const recentFailedLogins = this.recentEvents.filter(
			(e) => e.eventType === 'failed_login' && Date.now() - e.timestamp.getTime() < 5 * 60 * 1000, // 5 minutes
		);

		if (recentFailedLogins.length > 20) {
			alerts.push({
				type: 'brute_force',
				message: 'Potential brute force attack detected',
				severity: 'high',
				data: { attempts: recentFailedLogins.length, timeframe: '5 minutes' },
			});
		}

		return alerts;
	}

	private updateMetrics(event: AuthEvent): void {
		switch (event.eventType) {
			case 'login':
				this.metrics.totalLogins++;
				break;
			case 'failed_login':
				this.metrics.failedLogins++;
				break;
			case 'register':
				this.metrics.newRegistrations++;
				break;
			case '2fa_enabled':
				this.metrics.twoFactorEnabled++;
				break;
			case 'oauth_signin':
				this.metrics.oauthSignins++;
				break;
		}
	}

	private async emitToMonitoringSystems(event: AuthEvent): Promise<void> {
		// Emit to console for development
		if (process.env.NODE_ENV === 'development') {
			console.log(`[Auth Event] ${event.eventType}:`, {
				userId: event.userId,
				timestamp: event.timestamp,
			});
		}

		try {
			await externalMonitoringService.emitAuthEvent({
				userId: event.userId,
				eventType: event.eventType,
				ipAddress: event.ipAddress,
				userAgent: event.userAgent,
				metadata: event.metadata,
				timestamp: event.timestamp,
			});
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			logger.warn('brAInwav auth monitoring external dispatch failure', {
				eventType: event.eventType,
				userId: event.userId,
				reason,
			});
		}
	}

	private generateEventId(): string {
		return `auth_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
	}

	private getTimeRangeCutoff(timeRange: string): Date {
		const now = new Date();
		switch (timeRange) {
			case '1h':
				return new Date(now.getTime() - 60 * 60 * 1000);
			case '24h':
				return new Date(now.getTime() - 24 * 60 * 60 * 1000);
			case '7d':
				return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			case '30d':
				return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			default:
				return new Date(now.getTime() - 24 * 60 * 60 * 1000);
		}
	}

	private startMetricsCollection(): void {
		// Periodically save metrics to database
		setInterval(
			() => {
				this.saveMetricsToDatabase();
			},
			5 * 60 * 1000,
		); // Every 5 minutes
	}

	private async saveMetricsToDatabase(): Promise<void> {
		try {
			await db.insert({
				table: 'auth_metrics',
				values: [
					{
						metrics: this.metrics,
						timestamp: new Date(),
					},
				],
			});
		} catch (error) {
			console.error('Failed to save auth metrics:', error);
		}
	}
}

// Export singleton instance
export const authMonitoringService = AuthMonitoringService.getInstance();
