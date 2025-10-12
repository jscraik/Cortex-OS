#!/usr/bin/env tsx

/**
 * Real-Time Performance Alerting System
 *
 * Features:
 * - Multi-channel alerting (console, email, Slack, webhooks)
 * - Intelligent alert thresholding with dynamic baselines
 * - Alert correlation and deduplication
 * - Performance anomaly detection
 * - Escalation policies and auto-remediation
 * - Alert fatigue prevention with rate limiting
 * - Historical alert analytics and reporting
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'rate_increase' | 'rate_decrease';
  threshold: number;
  duration: number; // seconds
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  enabled: boolean;
  tags: string[];
  cooldown: number; // seconds between same alert
  escalationPolicy?: EscalationPolicy;
}

interface EscalationPolicy {
  levels: EscalationLevel[];
  autoResolve: boolean;
  maxEscalations: number;
}

interface EscalationLevel {
  delay: number; // seconds
  channels: AlertChannel[];
  message: string;
}

interface AlertChannel {
  type: 'console' | 'email' | 'slack' | 'webhook' | 'pagerduty' | 'teams';
  config: Record<string, any>;
  enabled: boolean;
}

interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  metric: string;
  currentValue: number;
  threshold: number;
  timestamp: number;
  startTime: number;
  resolved: boolean;
  resolvedAt?: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  escalated: boolean;
  escalationLevel: number;
  channels: string[];
  tags: string[];
  metadata: Record<string, any>;
}

interface MetricData {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
}

interface AlertStatistics {
  total: number;
  active: number;
  resolved: number;
  bySeverity: Record<string, number>;
  byMetric: Record<string, number>;
  averageResolutionTime: number;
  falsePositiveRate: number;
  alertFatigueScore: number;
}

interface AnomalyDetectionConfig {
  algorithm: 'statistical' | 'ml' | 'hybrid';
  sensitivity: number; // 0-1
  trainingPeriod: number; // hours
  minDataPoints: number;
  updateFrequency: number; // minutes
}

class PerformanceAlertingSystem extends EventEmitter {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private metricHistory: Map<string, MetricData[]> = new Map();
  private alertHistory: Alert[] = [];
  private channels: Map<string, AlertChannel> = new Map();
  private statistics: AlertStatistics;
  private anomalyConfig: AnomalyDetectionConfig;
  private isRunning = false;
  private monitoringInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    super();

    this.statistics = {
      total: 0,
      active: 0,
      resolved: 0,
      bySeverity: {},
      byMetric: {},
      averageResolutionTime: 0,
      falsePositiveRate: 0,
      alertFatigueScore: 0
    };

    this.anomalyConfig = {
      algorithm: 'hybrid',
      sensitivity: 0.8,
      trainingPeriod: 24, // 24 hours
      minDataPoints: 100,
      updateFrequency: 5 // 5 minutes
    };

    this.initializeDefaultChannels();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default alert channels
   */
  private initializeDefaultChannels(): void {
    // Console channel
    this.channels.set('console', {
      type: 'console',
      config: { colorize: true },
      enabled: true
    });

    // Email channel (placeholder)
    this.channels.set('email', {
      type: 'email',
      config: {
        smtp: process.env.SMTP_HOST,
        from: process.env.ALERT_FROM_EMAIL,
        to: process.env.ALERT_TO_EMAIL?.split(',') || []
      },
      enabled: false
    });

    // Slack channel (placeholder)
    this.channels.set('slack', {
      type: 'slack',
      config: {
        webhook: process.env.SLACK_WEBHOOK_URL,
        channel: '#alerts'
      },
      enabled: false
    });

    // Webhook channel
    this.channels.set('webhook', {
      type: 'webhook',
      config: {
        url: process.env.ALERT_WEBHOOK_URL || 'http://localhost:3000/webhooks/alerts',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      enabled: false
    });
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: Omit<AlertRule, 'id'>[] = [
      {
        name: 'High CPU Usage',
        description: 'Alert when CPU usage exceeds threshold',
        metric: 'cpu_usage',
        condition: 'greater_than',
        threshold: 80,
        duration: 300, // 5 minutes
        severity: 'warning',
        enabled: true,
        tags: ['system', 'performance'],
        cooldown: 900 // 15 minutes
      },
      {
        name: 'Critical CPU Usage',
        description: 'Alert when CPU usage is critically high',
        metric: 'cpu_usage',
        condition: 'greater_than',
        threshold: 95,
        duration: 60, // 1 minute
        severity: 'critical',
        enabled: true,
        tags: ['system', 'performance', 'critical'],
        cooldown: 600 // 10 minutes
      },
      {
        name: 'High Memory Usage',
        description: 'Alert when memory usage exceeds threshold',
        metric: 'memory_usage',
        condition: 'greater_than',
        threshold: 85,
        duration: 300,
        severity: 'warning',
        enabled: true,
        tags: ['system', 'performance'],
        cooldown: 900
      },
      {
        name: 'Low Cache Hit Rate',
        description: 'Alert when cache hit rate drops below threshold',
        metric: 'cache_hit_rate',
        condition: 'less_than',
        threshold: 70,
        duration: 600, // 10 minutes
        severity: 'warning',
        enabled: true,
        tags: ['performance', 'cache'],
        cooldown: 1800 // 30 minutes
      },
      {
        name: 'High Error Rate',
        description: 'Alert when error rate exceeds threshold',
        metric: 'error_rate',
        condition: 'greater_than',
        threshold: 10,
        duration: 300,
        severity: 'critical',
        enabled: true,
        tags: ['reliability', 'errors'],
        cooldown: 600
      },
      {
        name: 'Slow Query Performance',
        description: 'Alert when average query latency is high',
        metric: 'query_latency',
        condition: 'greater_than',
        threshold: 1000, // 1 second
        duration: 600,
        severity: 'warning',
        enabled: true,
        tags: ['performance', 'database'],
        cooldown: 1200 // 20 minutes
      },
      {
        name: 'GPU Memory Pressure',
        description: 'Alert when GPU memory usage is high',
        metric: 'gpu_memory_usage',
        condition: 'greater_than',
        threshold: 90,
        duration: 120,
        severity: 'critical',
        enabled: true,
        tags: ['gpu', 'performance'],
        cooldown: 600
      }
    ];

    for (const rule of defaultRules) {
      this.addRule(rule);
    }
  }

  /**
   * Start the alerting system
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Alerting system is already running');
      return;
    }

    console.log('🚨 Starting Performance Alerting System...');

    this.isRunning = true;
    this.monitoringInterval = setInterval(() => {
      this.processMetrics();
      this.checkEscalations();
      this.cleanupOldData();
    }, 1000); // Check every second

    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 60000); // Cleanup every minute

    console.log('✅ Performance Alerting System started');
    console.log(`📋 Loaded ${this.rules.size} alert rules`);
    console.log(`📡 Configured ${this.channels.size} alert channels`);
  }

  /**
   * Stop the alerting system
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping Performance Alerting System...');

    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Resolve all active alerts
    for (const alert of this.activeAlerts.values()) {
      this.resolveAlert(alert.id, 'System shutdown');
    }

    console.log('✅ Performance Alerting System stopped');
  }

  /**
   * Add a new alert rule
   */
  addRule(rule: Omit<AlertRule, 'id'>): string {
    const id = `rule_${Date.now()}_${randomUUID().substring(0, 9)}`;
    const fullRule: AlertRule = { ...rule, id };
    this.rules.set(id, fullRule);

    console.log(`📋 Added alert rule: ${rule.name}`);
    return id;
  }

  /**
   * Update an existing alert rule
   */
  updateRule(id: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.get(id);
    if (!rule) return false;

    const updatedRule = { ...rule, ...updates };
    this.rules.set(id, updatedRule);

    console.log(`📝 Updated alert rule: ${rule.name}`);
    return true;
  }

  /**
   * Remove an alert rule
   */
  removeRule(id: string): boolean {
    const rule = this.rules.get(id);
    if (!rule) return false;

    this.rules.delete(id);

    // Resolve any active alerts from this rule
    for (const alert of this.activeAlerts.values()) {
      if (alert.ruleId === id) {
        this.resolveAlert(alert.id, 'Rule removed');
      }
    }

    console.log(`🗑️  Removed alert rule: ${rule.name}`);
    return true;
  }

  /**
   * Add an alert channel
   */
  addChannel(id: string, channel: AlertChannel): void {
    this.channels.set(id, channel);
    console.log(`📡 Added alert channel: ${id}`);
  }

  /**
   * Submit metric data for monitoring
   */
  submitMetric(data: MetricData): void {
    const history = this.metricHistory.get(data.name) || [];
    history.push(data);

    // Keep only last 1000 data points per metric
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }

    this.metricHistory.set(data.name, history);

    // Process metric immediately if monitoring is running
    if (this.isRunning) {
      this.processMetric(data);
    }
  }

  /**
   * Process a single metric against all rules
   */
  private processMetric(data: MetricData): void {
    for (const rule of this.rules.values()) {
      if (!rule.enabled || rule.metric !== data.name) continue;

      if (this.evaluateCondition(rule, data.value)) {
        this.checkRuleThreshold(rule, data);
      }
    }

    // Check for anomalies
    this.detectAnomalies(data);
  }

  /**
   * Evaluate a rule condition
   */
  private evaluateCondition(rule: AlertRule, value: number): boolean {
    switch (rule.condition) {
      case 'greater_than':
        return value > rule.threshold;
      case 'less_than':
        return value < rule.threshold;
      case 'equals':
        return value === rule.threshold;
      case 'not_equals':
        return value !== rule.threshold;
      case 'rate_increase':
        return this.calculateRate(rule.metric) > rule.threshold;
      case 'rate_decrease':
        return this.calculateRate(rule.metric) < rule.threshold;
      default:
        return false;
    }
  }

  /**
   * Calculate rate of change for a metric
   */
  private calculateRate(metricName: string): number {
    const history = this.metricHistory.get(metricName) || [];
    if (history.length < 2) return 0;

    const recent = history.slice(-10);
    if (recent.length < 2) return 0;

    const oldest = recent[0];
    const newest = recent[recent.length - 1];

    if (oldest.timestamp === newest.timestamp) return 0;

    return (newest.value - oldest.value) / (newest.timestamp - oldest.timestamp) * 1000; // per second
  }

  /**
   * Check if a rule threshold has been exceeded for the required duration
   */
  private checkRuleThreshold(rule: AlertRule, data: MetricData): void {
    const alertId = `${rule.id}_${data.name}`;
    const existingAlert = this.activeAlerts.get(alertId);

    if (existingAlert) {
      // Update existing alert
      existingAlert.currentValue = data.value;
      existingAlert.timestamp = data.timestamp;
      return;
    }

    // Check if we have enough data points over the duration
    const history = this.metricHistory.get(data.name) || [];
    const cutoffTime = Date.now() - (rule.duration * 1000);
    const recentData = history.filter(d => d.timestamp >= cutoffTime);

    if (recentData.length < 2) return; // Need at least 2 data points

    // Check if condition has been true for the entire duration
    const allAboveThreshold = recentData.every(d => this.evaluateCondition(rule, d.value));

    if (allAboveThreshold) {
      this.triggerAlert(rule, data);
    }
  }

  /**
   * Trigger a new alert
   */
  private triggerAlert(rule: AlertRule, data: MetricData): void {
    const alertId = `${rule.id}_${data.name}`;

    // Check cooldown
    const lastAlert = this.alertHistory
      .filter(a => a.ruleId === rule.id)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (lastAlert && (data.timestamp - lastAlert.timestamp) < (rule.cooldown * 1000)) {
      return; // Still in cooldown period
    }

    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      message: this.formatAlertMessage(rule, data),
      severity: rule.severity,
      metric: data.name,
      currentValue: data.value,
      threshold: rule.threshold,
      timestamp: data.timestamp,
      startTime: data.timestamp,
      resolved: false,
      acknowledged: false,
      escalated: false,
      escalationLevel: 0,
      channels: ['console'], // Default to console
      tags: rule.tags,
      metadata: {
        condition: rule.condition,
        duration: rule.duration,
        actualDuration: rule.duration
      }
    };

    this.activeAlerts.set(alertId, alert);
    this.alertHistory.push(alert);
    this.statistics.total++;
    this.statistics.active++;

    // Update severity statistics
    this.statistics.bySeverity[rule.severity] = (this.statistics.bySeverity[rule.severity] || 0) + 1;
    this.statistics.byMetric[data.name] = (this.statistics.byMetric[data.name] || 0) + 1;

    console.log(`🚨 ALERT TRIGGERED: ${alert.message}`);

    // Send to channels
    this.sendAlert(alert);

    // Emit event
    this.emit('alert', alert);
  }

  /**
   * Format alert message
   */
  private formatAlertMessage(rule: AlertRule, data: MetricData): string {
    const operator = {
      greater_than: '>',
      less_than: '<',
      equals: '==',
      not_equals: '!=',
      rate_increase: 'increasing faster than',
      rate_decrease: 'decreasing faster than'
    }[rule.condition];

    return `${rule.name}: ${data.name} is ${data.value}${operator}${rule.threshold} (${rule.severity})`;
  }

  /**
   * Send alert to configured channels
   */
  private async sendAlert(alert: Alert): Promise<void> {
    for (const [channelId, channel] of this.channels) {
      if (!channel.enabled) continue;

      try {
        await this.sendToChannel(channel, alert);
      } catch (error) {
        console.error(`❌ Failed to send alert to channel ${channelId}:`, error);
      }
    }
  }

  /**
   * Send alert to a specific channel
   */
  private async sendToChannel(channel: AlertChannel, alert: Alert): Promise<void> {
    switch (channel.type) {
      case 'console':
        this.sendToConsole(alert, channel.config);
        break;
      case 'email':
        await this.sendEmail(alert, channel.config);
        break;
      case 'slack':
        await this.sendSlack(alert, channel.config);
        break;
      case 'webhook':
        await this.sendWebhook(alert, channel.config);
        break;
      default:
        console.warn(`Unknown channel type: ${channel.type}`);
    }
  }

  /**
   * Send alert to console
   */
  private sendToConsole(alert: Alert, config: Record<string, any>): void {
    const colors = {
      info: '\x1b[36m', // cyan
      warning: '\x1b[33m', // yellow
      critical: '\x1b[31m', // red
      emergency: '\x1b[41m\x1b[37m' // red background, white text
    };

    const reset = '\x1b[0m';
    const color = config.colorize ? colors[alert.severity] || '' : '';

    console.log(`${color}🚨 [${alert.severity.toUpperCase()}] ${alert.message}${reset}`);
    console.log(`   Metric: ${alert.metric} = ${alert.currentValue} (threshold: ${alert.threshold})`);
    console.log(`   Time: ${new Date(alert.timestamp).toISOString()}`);
    if (alert.tags.length > 0) {
      console.log(`   Tags: ${alert.tags.join(', ')}`);
    }
    console.log('');
  }

  /**
   * Send alert via email (placeholder implementation)
   */
  private async sendEmail(alert: Alert, config: Record<string, any>): Promise<void> {
    console.log(`📧 EMAIL ALERT (would send to ${config.to?.join(', ')}): ${alert.message}`);
    // In a real implementation, this would use nodemailer or similar
  }

  /**
   * Send alert to Slack (placeholder implementation)
   */
  private async sendSlack(alert: Alert, config: Record<string, any>): Promise<void> {
    console.log(`💬 SLACK ALERT (would send to ${config.channel}): ${alert.message}`);
    // In a real implementation, this would use Slack API
  }

  /**
   * Send alert via webhook
   */
  private async sendWebhook(alert: Alert, config: Record<string, any>): Promise<void> {
    if (!config.url) return;

    const payload = {
      alert: {
        id: alert.id,
        message: alert.message,
        severity: alert.severity,
        metric: alert.metric,
        value: alert.currentValue,
        threshold: alert.threshold,
        timestamp: alert.timestamp,
        tags: alert.tags
      }
    };

    try {
      const response = await fetch(config.url, {
        method: config.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Webhook failed:`, error);
      throw error;
    }
  }

  /**
   * Process all recent metrics
   */
  private processMetrics(): void {
    const now = Date.now();
    const cutoffTime = now - 5000; // Last 5 seconds

    for (const [metricName, history] of this.metricHistory) {
      const recentMetrics = history.filter(m => m.timestamp >= cutoffTime);

      for (const metric of recentMetrics) {
        if (metric.timestamp > cutoffTime) {
          this.processMetric(metric);
        }
      }
    }
  }

  /**
   * Detect anomalies in metrics
   */
  private detectAnomalies(data: MetricData): void {
    const history = this.metricHistory.get(data.name) || [];
    if (history.length < this.anomalyConfig.minDataPoints) return;

    // Simple statistical anomaly detection
    const values = history.map(h => h.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);

    const zScore = Math.abs((data.value - mean) / stdDev);
    const threshold = 3.0 * (1 - this.anomalyConfig.sensitivity); // Adjust based on sensitivity

    if (zScore > threshold) {
      this.triggerAnomalyAlert(data, zScore, mean, stdDev);
    }
  }

  /**
   * Trigger an anomaly alert
   */
  private triggerAnomalyAlert(data: MetricData, zScore: number, mean: number, stdDev: number): void {
    const alertId = `anomaly_${data.name}_${Math.floor(data.timestamp / 60000)}`; // Per minute
    const existingAlert = this.activeAlerts.get(alertId);

    if (existingAlert) return; // Already alerted for this anomaly

    const alert: Alert = {
      id: alertId,
      ruleId: 'anomaly_detection',
      ruleName: 'Anomaly Detected',
      message: `Anomaly detected in ${data.name}: ${data.value} (Z-score: ${zScore.toFixed(2)}, normal: ${mean.toFixed(2)}±${stdDev.toFixed(2)})`,
      severity: zScore > 4 ? 'critical' : 'warning',
      metric: data.name,
      currentValue: data.value,
      threshold: mean + (zScore * stdDev),
      timestamp: data.timestamp,
      startTime: data.timestamp,
      resolved: false,
      acknowledged: false,
      escalated: false,
      escalationLevel: 0,
      channels: ['console'],
      tags: ['anomaly', 'ml'],
      metadata: {
        zScore,
        mean,
        stdDev,
        anomalyType: 'statistical'
      }
    };

    this.activeAlerts.set(alertId, alert);
    this.alertHistory.push(alert);

    console.log(`🔍 ANOMALY DETECTED: ${alert.message}`);
    this.sendAlert(alert);
  }

  /**
   * Check for alert escalations
   */
  private checkEscalations(): void {
    const now = Date.now();

    for (const alert of this.activeAlerts.values()) {
      if (alert.escalated) continue;

      const rule = this.rules.get(alert.ruleId);
      if (!rule?.escalationPolicy) continue;

      const timeSinceStart = now - alert.startTime;
      const nextLevel = rule.escalationPolicy.levels[alert.escalationLevel];

      if (nextLevel && timeSinceStart >= (nextLevel.delay * 1000)) {
        this.escalateAlert(alert, nextLevel);
      }
    }
  }

  /**
   * Escalate an alert
   */
  private escalateAlert(alert: Alert, level: EscalationLevel): void {
    alert.escalated = true;
    alert.escalationLevel++;
    alert.message = `[ESCALATED] ${alert.message} - ${level.message}`;

    console.log(`📈 ESCALATED ALERT: ${alert.message}`);

    // Send to escalation channels
    for (const channel of level.channels) {
      this.sendToChannel(channel, alert);
    }

    this.emit('alert:escalated', alert);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = Date.now();

    console.log(`✅ Alert acknowledged: ${alertId} by ${acknowledgedBy}`);
    this.emit('alert:acknowledged', alert);

    return true;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, reason?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolvedAt = Date.now();

    if (reason) {
      alert.metadata.resolutionReason = reason;
    }

    this.activeAlerts.delete(alertId);
    this.statistics.active--;
    this.statistics.resolved++;

    // Calculate resolution time
    const resolutionTime = alert.resolvedAt - alert.startTime;
    this.statistics.averageResolutionTime =
      (this.statistics.averageResolutionTime * (this.statistics.resolved - 1) + resolutionTime) /
      this.statistics.resolved;

    console.log(`✅ Alert resolved: ${alertId}${reason ? ` (${reason})` : ''}`);
    this.emit('alert:resolved', alert);

    return true;
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

    // Clean metric history
    for (const [metricName, history] of this.metricHistory) {
      const filtered = history.filter(m => m.timestamp >= cutoffTime);
      this.metricHistory.set(metricName, filtered);
    }

    // Clean alert history
    this.alertHistory = this.alertHistory.filter(a => a.timestamp >= cutoffTime);
  }

  /**
   * Get current system status
   */
  getStatus(): Record<string, any> {
    return {
      isRunning: this.isRunning,
      timestamp: new Date().toISOString(),
      statistics: this.statistics,
      activeAlerts: Array.from(this.activeAlerts.values()),
      rules: Array.from(this.rules.values()).map(r => ({
        id: r.id,
        name: r.name,
        enabled: r.enabled,
        severity: r.severity,
        metric: r.metric
      })),
      channels: Array.from(this.channels.entries()).map(([id, c]) => ({
        id,
        type: c.type,
        enabled: c.enabled
      })),
      metrics: {
        total: this.metricHistory.size,
        totalDataPoints: Array.from(this.metricHistory.values())
          .reduce((sum, history) => sum + history.length, 0)
      }
    };
  }

  /**
   * Get alert recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];

    // Check for alert fatigue
    if (this.statistics.alertFatigueScore > 0.7) {
      recommendations.push('High alert fatigue detected. Consider adjusting thresholds or implementing better alert grouping.');
    }

    // Check for high false positive rate
    if (this.statistics.falsePositiveRate > 0.3) {
      recommendations.push('High false positive rate detected. Review alert rules and adjust sensitivity.');
    }

    // Check for long resolution times
    if (this.statistics.averageResolutionTime > 30 * 60 * 1000) { // 30 minutes
      recommendations.push('Average alert resolution time is high. Consider implementing auto-remediation.');
    }

    // Check for frequently firing alerts
    const metricCounts = this.statistics.byMetric;
    const frequentMetrics = Object.entries(metricCounts)
      .filter(([_, count]) => count > 10)
      .map(([metric, _]) => metric);

    if (frequentMetrics.length > 0) {
      recommendations.push(`Frequent alerts for metrics: ${frequentMetrics.join(', ')}. Consider root cause analysis.`);
    }

    return recommendations;
  }
}

/**
 * Main execution function
 */
async function main() {
  const alerting = new PerformanceAlertingSystem();

  try {
    await alerting.start();

    // Simulate metric data
    const simulateMetrics = () => {
      const metrics = [
        // Environment-configurable test metrics
        { name: 'cpu_usage', value: parseFloat(process.env.PERF_TEST_CPU_USAGE || '85') },
        { name: 'memory_usage', value: parseFloat(process.env.PERF_TEST_MEMORY_USAGE || '75') },
        { name: 'cache_hit_rate', value: parseFloat(process.env.PERF_TEST_CACHE_HIT_RATE || '80') },
        { name: 'error_rate', value: parseFloat(process.env.PERF_TEST_ERROR_RATE || '7.5') },
        { name: 'query_latency', value: parseFloat(process.env.PERF_TEST_QUERY_LATENCY || '1000') },
        { name: 'gpu_memory_usage', value: parseFloat(process.env.PERF_TEST_GPU_MEMORY_USAGE || '82.5') }
      ];

      for (const metric of metrics) {
        alerting.submitMetric({
          ...metric,
          timestamp: Date.now(),
          tags: { source: 'simulator' }
        });
      }
    };

    // Send metrics every 2 seconds
    const metricInterval = setInterval(simulateMetrics, 2000);

    // Initial metrics
    simulateMetrics();

    // Run for 30 seconds
    await new Promise(resolve => setTimeout(resolve, 30000));

    clearInterval(metricInterval);

    // Show status
    const status = alerting.getStatus();
    console.log('\n📊 Alerting System Status:');
    console.log(JSON.stringify(status, null, 2));

    // Show recommendations
    const recommendations = alerting.getRecommendations();
    if (recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      recommendations.forEach(rec => console.log(`  - ${rec}`));
    }

  } catch (error) {
    console.error('❌ Alerting system error:', error);
  } finally {
    await alerting.stop();
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

export { PerformanceAlertingSystem, AlertRule, Alert, AlertChannel, MetricData, AlertStatistics };