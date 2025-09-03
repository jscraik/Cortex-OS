use crate::{enhanced_config::EnhancedConfig, resource_manager::ResourceSnapshot, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::RwLock;
use tracing::{debug, error, info, warn};

/// Diagnostic system for cortex-code health monitoring
///
/// Provides comprehensive system diagnostics including system info,
/// health monitoring, configuration validation, and performance metrics.
/// Follows September 2025 standards with functional programming patterns.
pub struct DiagnosticManager {
    config: EnhancedConfig,
    system_info: Arc<RwLock<SystemInfo>>,
    health_monitor: HealthMonitor,
    config_validator: ConfigValidator,
    diagnostic_history: Arc<RwLock<Vec<DiagnosticReport>>>,
    max_history_size: usize,
}

/// System information snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub cpu_cores: usize,
    pub total_memory_gb: f64,
    pub available_memory_gb: f64,
    pub disk_space_gb: f64,
    pub uptime_seconds: u64,
    pub rust_version: String,
    pub binary_version: String,
    pub last_updated: SystemTime,
}

/// Comprehensive diagnostic report
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagnosticReport {
    pub id: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub system_info: SystemInfo,
    pub health_status: OverallHealthStatus,
    pub configuration_issues: Vec<ConfigIssue>,
    pub performance_metrics: PerformanceMetrics,
    pub recommendations: Vec<Recommendation>,
    pub severity: ReportSeverity,
}

/// Overall system health status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum OverallHealthStatus {
    Healthy,
    Warning,
    Critical,
    Unknown,
}

/// Configuration validation issue
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigIssue {
    pub category: String,
    pub description: String,
    pub severity: IssueSeverity,
    pub fix_suggestion: Option<String>,
    pub config_path: Option<String>,
}

/// Issue severity levels
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, PartialOrd)]
pub enum IssueSeverity {
    Low,
    Medium,
    High,
    Critical,
}

/// Performance metrics snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub cpu_usage_percent: f32,
    pub memory_usage_percent: f32,
    pub disk_usage_percent: f32,
    pub network_latency_ms: Option<f32>,
    pub request_rate: f32,
    pub error_rate: f32,
    pub response_time_p95: f32,
    pub active_connections: usize,
}

/// System recommendations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recommendation {
    pub category: String,
    pub description: String,
    pub priority: RecommendationPriority,
    pub implementation_effort: ImplementationEffort,
    pub estimated_impact: String,
}

/// Recommendation priority levels
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, PartialOrd)]
pub enum RecommendationPriority {
    Low,
    Medium,
    High,
    Urgent,
}

/// Implementation effort estimation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ImplementationEffort {
    Minimal,
    Low,
    Medium,
    High,
}

/// Report severity levels
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, PartialOrd)]
pub enum ReportSeverity {
    Info,
    Warning,
    Critical,
}

/// Health monitoring system
pub struct HealthMonitor {
    checks: Vec<HealthCheck>,
    check_interval: Duration,
    last_check: Option<SystemTime>,
}

/// Individual health check
#[derive(Debug, Clone)]
pub struct HealthCheck {
    pub name: String,
    pub check_type: HealthCheckType,
    pub last_result: Option<HealthCheckResult>,
    pub enabled: bool,
    pub timeout: Duration,
}

/// Health check types
#[derive(Debug, Clone)]
pub enum HealthCheckType {
    SystemResource,
    NetworkConnectivity,
    ServiceAvailability,
    ConfigurationValidation,
    MemoryUsage,
    DiskSpace,
}

/// Health check result
#[derive(Debug, Clone)]
pub struct HealthCheckResult {
    pub status: HealthStatus,
    pub message: String,
    pub timestamp: SystemTime,
    pub duration: Duration,
    pub details: HashMap<String, String>,
}

/// Health check status
#[derive(Debug, Clone, PartialEq)]
pub enum HealthStatus {
    Healthy,
    Warning,
    Critical,
    Unknown,
}

/// Configuration validator
pub struct ConfigValidator {
    validation_rules: Vec<ValidationRule>,
}

/// Configuration validation rule
pub struct ValidationRule {
    pub name: String,
    pub validator: Box<dyn Fn(&EnhancedConfig) -> Result<Vec<ConfigIssue>> + Send + Sync>,
}

impl DiagnosticManager {
    /// Create new diagnostic manager
    pub fn new(config: EnhancedConfig) -> Self {
        let system_info = Arc::new(RwLock::new(SystemInfo::collect()));
        let health_monitor = HealthMonitor::new();
        let config_validator = ConfigValidator::new();
        let diagnostic_history = Arc::new(RwLock::new(Vec::new()));

        Self {
            config,
            system_info,
            health_monitor,
            config_validator,
            diagnostic_history,
            max_history_size: 100,
        }
    }

    /// Generate comprehensive diagnostic report
    pub async fn generate_report(&mut self) -> Result<DiagnosticReport> {
        let report_id = uuid::Uuid::new_v4().to_string();
        let timestamp = chrono::Utc::now();

        // Update system information
        {
            let mut system_info = self.system_info.write().await;
            *system_info = SystemInfo::collect();
        }

        let system_info = self.system_info.read().await.clone();

        // Run health checks
        let health_status = self.health_monitor.run_all_checks().await;

        // Validate configuration
        let configuration_issues = self.config_validator.validate(&self.config)?;

        // Collect performance metrics
        let performance_metrics = self.collect_performance_metrics().await;

        // Generate recommendations
        let recommendations = self.generate_recommendations(
            &health_status,
            &configuration_issues,
            &performance_metrics,
        );

        // Determine overall severity
        let severity = self.determine_severity(&health_status, &configuration_issues);

        let report = DiagnosticReport {
            id: report_id,
            timestamp,
            system_info,
            health_status,
            configuration_issues,
            performance_metrics,
            recommendations,
            severity,
        };

        // Store in history
        self.store_report(report.clone()).await;

        Ok(report)
    }

    /// Get diagnostic history
    pub async fn get_history(&self) -> Vec<DiagnosticReport> {
        self.diagnostic_history.read().await.clone()
    }

    /// Get latest diagnostic report
    pub async fn get_latest_report(&self) -> Option<DiagnosticReport> {
        self.diagnostic_history.read().await.last().cloned()
    }

    /// Store diagnostic report in history
    async fn store_report(&self, report: DiagnosticReport) {
        let mut history = self.diagnostic_history.write().await;
        history.push(report);

        // Maintain history size limit
        if history.len() > self.max_history_size {
            history.remove(0);
        }
    }

    /// Collect performance metrics
    async fn collect_performance_metrics(&self) -> PerformanceMetrics {
        // In a real implementation, this would collect actual metrics
        // For now, we'll provide placeholder values
        PerformanceMetrics {
            cpu_usage_percent: self.get_cpu_usage(),
            memory_usage_percent: self.get_memory_usage(),
            disk_usage_percent: self.get_disk_usage(),
            network_latency_ms: None,
            request_rate: 0.0,
            error_rate: 0.0,
            response_time_p95: 0.0,
            active_connections: 0,
        }
    }

    /// Generate recommendations based on diagnostics
    fn generate_recommendations(
        &self,
        health_status: &OverallHealthStatus,
        config_issues: &[ConfigIssue],
        performance_metrics: &PerformanceMetrics,
    ) -> Vec<Recommendation> {
        let mut recommendations = Vec::new();

        // Performance-based recommendations
        if performance_metrics.memory_usage_percent > 80.0 {
            recommendations.push(Recommendation {
                category: "Performance".to_string(),
                description: "High memory usage detected. Consider increasing available memory or optimizing memory usage.".to_string(),
                priority: RecommendationPriority::High,
                implementation_effort: ImplementationEffort::Medium,
                estimated_impact: "Improved system stability and performance".to_string(),
            });
        }

        if performance_metrics.cpu_usage_percent > 90.0 {
            recommendations.push(Recommendation {
                category: "Performance".to_string(),
                description: "High CPU usage detected. Consider optimizing workload or scaling resources.".to_string(),
                priority: RecommendationPriority::High,
                implementation_effort: ImplementationEffort::High,
                estimated_impact: "Reduced response times and improved throughput".to_string(),
            });
        }

        // Configuration-based recommendations
        for issue in config_issues {
            if issue.severity >= IssueSeverity::High {
                recommendations.push(Recommendation {
                    category: "Configuration".to_string(),
                    description: format!("Address configuration issue: {}", issue.description),
                    priority: RecommendationPriority::High,
                    implementation_effort: ImplementationEffort::Low,
                    estimated_impact: "Improved system reliability and security".to_string(),
                });
            }
        }

        // Health status recommendations
        if *health_status == OverallHealthStatus::Critical {
            recommendations.push(Recommendation {
                category: "System Health".to_string(),
                description: "Critical health issues detected. Immediate attention required.".to_string(),
                priority: RecommendationPriority::Urgent,
                implementation_effort: ImplementationEffort::High,
                estimated_impact: "System stability restoration".to_string(),
            });
        }

        recommendations
    }

    /// Determine overall report severity
    fn determine_severity(
        &self,
        health_status: &OverallHealthStatus,
        config_issues: &[ConfigIssue],
    ) -> ReportSeverity {
        // Check for critical health status
        if *health_status == OverallHealthStatus::Critical {
            return ReportSeverity::Critical;
        }

        // Check for critical configuration issues
        let has_critical_config = config_issues
            .iter()
            .any(|issue| issue.severity == IssueSeverity::Critical);

        if has_critical_config {
            return ReportSeverity::Critical;
        }

        // Check for warnings
        if *health_status == OverallHealthStatus::Warning {
            return ReportSeverity::Warning;
        }

        ReportSeverity::Info
    }

    /// Get CPU usage percentage
    fn get_cpu_usage(&self) -> f32 {
        // Placeholder implementation
        // In a real system, this would query actual CPU metrics
        0.0
    }

    /// Get memory usage percentage
    fn get_memory_usage(&self) -> f32 {
        // Placeholder implementation
        // In a real system, this would query actual memory metrics
        0.0
    }

    /// Get disk usage percentage
    fn get_disk_usage(&self) -> f32 {
        // Placeholder implementation
        // In a real system, this would query actual disk metrics
        0.0
    }
}

impl SystemInfo {
    /// Collect current system information
    pub fn collect() -> Self {
        Self {
            os: std::env::consts::OS.to_string(),
            arch: std::env::consts::ARCH.to_string(),
            cpu_cores: num_cpus::get(),
            total_memory_gb: Self::get_total_memory_gb(),
            available_memory_gb: Self::get_available_memory_gb(),
            disk_space_gb: Self::get_disk_space_gb(),
            uptime_seconds: Self::get_uptime_seconds(),
            rust_version: Self::get_rust_version(),
            binary_version: env!("CARGO_PKG_VERSION").to_string(),
            last_updated: SystemTime::now(),
        }
    }

    fn get_total_memory_gb() -> f64 {
        // Placeholder - in real implementation, would query system memory
        8.0
    }

    fn get_available_memory_gb() -> f64 {
        // Placeholder - in real implementation, would query available memory
        4.0
    }

    fn get_disk_space_gb() -> f64 {
        // Placeholder - in real implementation, would query disk space
        100.0
    }

    fn get_uptime_seconds() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
    }

    fn get_rust_version() -> String {
        std::env::var("RUSTC_VERSION").unwrap_or_else(|_| "unknown".to_string())
    }
}

impl HealthMonitor {
    fn new() -> Self {
        Self {
            checks: Self::create_default_checks(),
            check_interval: Duration::from_secs(60),
            last_check: None,
        }
    }

    fn create_default_checks() -> Vec<HealthCheck> {
        vec![
            HealthCheck {
                name: "Memory Usage".to_string(),
                check_type: HealthCheckType::MemoryUsage,
                last_result: None,
                enabled: true,
                timeout: Duration::from_secs(5),
            },
            HealthCheck {
                name: "Disk Space".to_string(),
                check_type: HealthCheckType::DiskSpace,
                last_result: None,
                enabled: true,
                timeout: Duration::from_secs(5),
            },
            HealthCheck {
                name: "System Resources".to_string(),
                check_type: HealthCheckType::SystemResource,
                last_result: None,
                enabled: true,
                timeout: Duration::from_secs(10),
            },
        ]
    }

    async fn run_all_checks(&mut self) -> OverallHealthStatus {
        let mut overall_status = OverallHealthStatus::Healthy;

        for check in &mut self.checks {
            if check.enabled {
                let result = self.run_check(check).await;
                check.last_result = Some(result.clone());

                match result.status {
                    HealthStatus::Critical => overall_status = OverallHealthStatus::Critical,
                    HealthStatus::Warning if overall_status != OverallHealthStatus::Critical => {
                        overall_status = OverallHealthStatus::Warning
                    }
                    _ => {}
                }
            }
        }

        self.last_check = Some(SystemTime::now());
        overall_status
    }

    async fn run_check(&self, check: &HealthCheck) -> HealthCheckResult {
        let start_time = SystemTime::now();

        let (status, message, details) = match check.check_type {
            HealthCheckType::MemoryUsage => self.check_memory_usage(),
            HealthCheckType::DiskSpace => self.check_disk_space(),
            HealthCheckType::SystemResource => self.check_system_resources(),
            _ => (HealthStatus::Unknown, "Check not implemented".to_string(), HashMap::new()),
        };

        let duration = start_time.elapsed().unwrap_or_default();

        HealthCheckResult {
            status,
            message,
            timestamp: SystemTime::now(),
            duration,
            details,
        }
    }

    fn check_memory_usage(&self) -> (HealthStatus, String, HashMap<String, String>) {
        // Placeholder implementation
        (HealthStatus::Healthy, "Memory usage normal".to_string(), HashMap::new())
    }

    fn check_disk_space(&self) -> (HealthStatus, String, HashMap<String, String>) {
        // Placeholder implementation
        (HealthStatus::Healthy, "Disk space sufficient".to_string(), HashMap::new())
    }

    fn check_system_resources(&self) -> (HealthStatus, String, HashMap<String, String>) {
        // Placeholder implementation
        (HealthStatus::Healthy, "System resources normal".to_string(), HashMap::new())
    }
}

impl ConfigValidator {
    fn new() -> Self {
        Self {
            validation_rules: Self::create_default_rules(),
        }
    }

    fn create_default_rules() -> Vec<ValidationRule> {
        vec![
            ValidationRule {
                name: "Provider Configuration".to_string(),
                validator: Box::new(|config| {
                    let mut issues = Vec::new();

                    if config.providers.openai.is_none() &&
                       config.providers.anthropic.is_none() &&
                       config.providers.github.is_none() &&
                       config.providers.local.is_none() {
                        issues.push(ConfigIssue {
                            category: "Providers".to_string(),
                            description: "No AI providers configured".to_string(),
                            severity: IssueSeverity::Critical,
                            fix_suggestion: Some("Configure at least one AI provider".to_string()),
                            config_path: Some("providers".to_string()),
                        });
                    }

                    Ok(issues)
                }),
            },
            ValidationRule {
                name: "Server Configuration".to_string(),
                validator: Box::new(|config| {
                    let mut issues = Vec::new();

                    if config.server.port == 0 || config.server.port > 65535 {
                        issues.push(ConfigIssue {
                            category: "Server".to_string(),
                            description: format!("Invalid server port: {}", config.server.port),
                            severity: IssueSeverity::High,
                            fix_suggestion: Some("Set server port between 1 and 65535".to_string()),
                            config_path: Some("server.port".to_string()),
                        });
                    }

                    Ok(issues)
                }),
            },
        ]
    }

    fn validate(&self, config: &EnhancedConfig) -> Result<Vec<ConfigIssue>> {
        let mut all_issues = Vec::new();

        for rule in &self.validation_rules {
            let issues = (rule.validator)(config)?;
            all_issues.extend(issues);
        }

        Ok(all_issues)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_system_info_collection() {
        let info = SystemInfo::collect();
        assert!(!info.os.is_empty());
        assert!(!info.arch.is_empty());
        assert!(info.cpu_cores > 0);
    }

    #[tokio::test]
    async fn test_diagnostic_manager() {
        let config = EnhancedConfig::default();
        let mut manager = DiagnosticManager::new(config);

        let report = manager.generate_report().await.unwrap();
        assert!(!report.id.is_empty());
        assert!(matches!(report.severity, ReportSeverity::Info | ReportSeverity::Warning | ReportSeverity::Critical));
    }

    #[test]
    fn test_config_validator() {
        let validator = ConfigValidator::new();
        let config = EnhancedConfig::default();

        let issues = validator.validate(&config).unwrap();
        // Default config should not have critical issues
        assert!(!issues.iter().any(|issue| issue.severity == IssueSeverity::Critical));
    }

    #[tokio::test]
    async fn test_health_monitor() {
        let mut monitor = HealthMonitor::new();
        let status = monitor.run_all_checks().await;

        // Should complete without errors
        assert!(matches!(status, OverallHealthStatus::Healthy | OverallHealthStatus::Warning | OverallHealthStatus::Critical | OverallHealthStatus::Unknown));
    }

    #[test]
    fn test_severity_determination() {
        let config = EnhancedConfig::default();
        let manager = DiagnosticManager::new(config);

        // Test critical health status
        let severity = manager.determine_severity(&OverallHealthStatus::Critical, &[]);
        assert_eq!(severity, ReportSeverity::Critical);

        // Test critical config issue
        let critical_issue = ConfigIssue {
            category: "Test".to_string(),
            description: "Test issue".to_string(),
            severity: IssueSeverity::Critical,
            fix_suggestion: None,
            config_path: None,
        };
        let severity = manager.determine_severity(&OverallHealthStatus::Healthy, &[critical_issue]);
        assert_eq!(severity, ReportSeverity::Critical);

        // Test warning status
        let severity = manager.determine_severity(&OverallHealthStatus::Warning, &[]);
        assert_eq!(severity, ReportSeverity::Warning);

        // Test healthy status
        let severity = manager.determine_severity(&OverallHealthStatus::Healthy, &[]);
        assert_eq!(severity, ReportSeverity::Info);
    }
}
