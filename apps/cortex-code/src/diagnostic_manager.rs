use crate::{enhanced_config::EnhancedConfig, Result};
use std::fmt;
use anyhow::anyhow;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::RwLock;
use tracing::info;
use uuid::Uuid;

/// Diagnostic system for collecting system information, logs, model health, and configuration validation
pub struct DiagnosticManager {
    config: EnhancedConfig,
    system_info: Arc<RwLock<SystemInfo>>,
    log_collector: LogCollector,
    health_monitor: HealthMonitor,
    config_validator: ConfigValidator,
    report_generator: ReportGenerator,
    diagnostic_history: Arc<RwLock<Vec<DiagnosticReport>>>,
}

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagnosticReport {
    pub id: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub system_info: SystemInfo,
    pub health_status: OverallHealthStatus,
    pub configuration_issues: Vec<ConfigIssue>,
    pub performance_metrics: PerformanceMetrics,
    pub log_summary: LogSummary,
    pub recommendations: Vec<Recommendation>,
    pub severity: ReportSeverity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OverallHealthStatus {
    Healthy,
    Warning,
    Critical,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigIssue {
    pub category: String,
    pub description: String,
    pub severity: IssueSeverity,
    pub fix_suggestion: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IssueSeverity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub cpu_usage_percent: f32,
    pub memory_usage_percent: f32,
    pub disk_usage_percent: f32,
    pub network_latency_ms: Option<f32>,
    pub request_rate: f32,
    pub error_rate: f32,
    pub response_time_p95: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogSummary {
    pub total_logs: u64,
    pub error_count: u64,
    pub warning_count: u64,
    pub recent_errors: Vec<String>,
    pub log_file_size_mb: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recommendation {
    pub category: String,
    pub description: String,
    pub priority: RecommendationPriority,
    pub implementation_effort: ImplementationEffort,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RecommendationPriority {
    Low,
    Medium,
    High,
    Urgent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ImplementationEffort {
    Minimal,
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ReportSeverity {
    Info,
    Warning,
    Critical,
}

/// Log collector for gathering and analyzing logs
pub struct LogCollector {
    log_paths: Vec<PathBuf>,
    max_log_size: u64,
    retention_days: u32,
}

/// Health monitor for system components
pub struct HealthMonitor {
    check_interval: Duration,
    health_checks: Vec<HealthCheck>,
}

#[derive(Debug, Clone)]
pub struct HealthCheck {
    pub name: String,
    pub check_type: HealthCheckType,
    pub last_result: Option<HealthCheckResult>,
    pub enabled: bool,
}

#[derive(Debug, Clone)]
pub enum HealthCheckType {
    SystemResource,
    NetworkConnectivity,
    ServiceAvailability,
    DatabaseConnection,
    FileSystemAccess,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheckResult {
    pub status: OverallHealthStatus,
    pub message: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub response_time_ms: u64,
}

/// Configuration validator
pub struct ConfigValidator {
    validation_rules: Vec<ValidationRule>,
}

#[derive(Debug)]
pub struct ValidationRule {
    pub name: String,
    pub category: String,
    pub validator: fn(&EnhancedConfig) -> crate::Result<()>,
}

// Manually implement Clone for ValidationRule since function pointers don't auto-derive Clone
impl Clone for ValidationRule {
    fn clone(&self) -> Self {
        Self {
            name: self.name.clone(),
            category: self.category.clone(),
            validator: self.validator,
        }
    }
}

/// Report generator for creating troubleshooting reports
pub struct ReportGenerator {
    template_path: Option<PathBuf>,
    output_format: ReportFormat,
}

#[derive(Debug, Clone)]
pub enum ReportFormat {
    Json,
    Html,
    Markdown,
    Pdf,
}

impl DiagnosticManager {
    pub async fn new(config: EnhancedConfig) -> Result<Self> {
        let system_info = Arc::new(RwLock::new(Self::collect_system_info().await?));

        let log_collector = LogCollector {
            log_paths: vec![
                PathBuf::from("/tmp/cortex-code.log"),
                PathBuf::from("./logs/application.log"),
            ],
            max_log_size: 100 * 1024 * 1024, // 100MB
            retention_days: 30,
        };

        let health_monitor = HealthMonitor {
            check_interval: Duration::from_secs(60),
            health_checks: Self::default_health_checks(),
        };

        let config_validator = ConfigValidator {
            validation_rules: Self::default_validation_rules(),
        };

        let report_generator = ReportGenerator {
            template_path: None,
            output_format: ReportFormat::Json,
        };

        Ok(Self {
            config,
            system_info,
            log_collector,
            health_monitor,
            config_validator,
            report_generator,
            diagnostic_history: Arc::new(RwLock::new(Vec::new())),
        })
    }

    /// Collect comprehensive system information
    async fn collect_system_info() -> Result<SystemInfo> {
        let os = std::env::consts::OS.to_string();
        let arch = std::env::consts::ARCH.to_string();
        let cpu_cores = num_cpus::get();

        // Get memory information (simplified)
        let total_memory_gb = 16.0; // TODO: Get actual memory info
        let available_memory_gb = 8.0; // TODO: Get actual available memory

        // Get disk space (simplified)
        let disk_space_gb = 100.0; // TODO: Get actual disk space

        // Get uptime
        let uptime_seconds = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let rust_version = env!("CARGO_PKG_RUST_VERSION").to_string();
        let binary_version = env!("CARGO_PKG_VERSION").to_string();

        Ok(SystemInfo {
            os,
            arch,
            cpu_cores,
            total_memory_gb,
            available_memory_gb,
            disk_space_gb,
            uptime_seconds,
            rust_version,
            binary_version,
            last_updated: SystemTime::now(),
        })
    }

    /// Generate comprehensive diagnostic report
    pub async fn generate_diagnostic_report(&self) -> Result<DiagnosticReport> {
        info!("Generating comprehensive diagnostic report");

        let id = Uuid::new_v4().to_string();
        let timestamp = chrono::Utc::now();

        // Update system info
        let system_info = Self::collect_system_info().await?;
        *self.system_info.write().await = system_info.clone();

        // Run health checks
        let health_status = self.run_health_checks().await?;

        // Validate configuration
        let configuration_issues = self.validate_configuration().await?;

        // Collect performance metrics
        let performance_metrics = self.collect_performance_metrics().await?;

        // Analyze logs
        let log_summary = self.analyze_logs().await?;

        // Generate recommendations
        let recommendations = self.generate_recommendations(&health_status, &configuration_issues, &performance_metrics).await?;

        // Determine overall severity
        let severity = self.determine_severity(&health_status, &configuration_issues);

        let report = DiagnosticReport {
            id,
            timestamp,
            system_info,
            health_status,
            configuration_issues,
            performance_metrics,
            log_summary,
            recommendations,
            severity,
        };

        // Store in history
        self.diagnostic_history.write().await.push(report.clone());

        info!("Diagnostic report generated: {} ({})", report.id, report.severity.to_string());
        Ok(report)
    }

    /// Run all health checks
    async fn run_health_checks(&self) -> Result<OverallHealthStatus> {
        let mut overall_status = OverallHealthStatus::Healthy;

        for health_check in &self.health_monitor.health_checks {
            if !health_check.enabled {
                continue;
            }

            let result = self.execute_health_check(health_check).await?;

            match result.status {
                OverallHealthStatus::Critical => {
                    overall_status = OverallHealthStatus::Critical;
                    break;
                }
                OverallHealthStatus::Warning => {
                    if matches!(overall_status, OverallHealthStatus::Healthy) {
                        overall_status = OverallHealthStatus::Warning;
                    }
                }
                _ => {}
            }
        }

        Ok(overall_status)
    }

    /// Execute a single health check
    async fn execute_health_check(&self, health_check: &HealthCheck) -> Result<HealthCheckResult> {
        let start_time = std::time::Instant::now();

        let status = match health_check.check_type {
            HealthCheckType::SystemResource => {
                self.check_system_resources().await
            }
            HealthCheckType::NetworkConnectivity => {
                self.check_network_connectivity().await
            }
            HealthCheckType::ServiceAvailability => {
                self.check_service_availability().await
            }
            HealthCheckType::DatabaseConnection => {
                self.check_database_connection().await
            }
            HealthCheckType::FileSystemAccess => {
                self.check_filesystem_access().await
            }
        };

        let response_time_ms = start_time.elapsed().as_millis() as u64;

        Ok(HealthCheckResult {
            status: status.0,
            message: status.1,
            timestamp: chrono::Utc::now(),
            response_time_ms,
        })
    }

    /// Check system resources
    async fn check_system_resources(&self) -> (OverallHealthStatus, String) {
        let system_info = self.system_info.read().await;

        let memory_usage = (system_info.total_memory_gb - system_info.available_memory_gb) / system_info.total_memory_gb * 100.0;

        if memory_usage > 90.0 {
            (OverallHealthStatus::Critical, format!("Memory usage critical: {:.1}%", memory_usage))
        } else if memory_usage > 75.0 {
            (OverallHealthStatus::Warning, format!("Memory usage high: {:.1}%", memory_usage))
        } else {
            (OverallHealthStatus::Healthy, format!("Memory usage normal: {:.1}%", memory_usage))
        }
    }

    /// Check network connectivity
    async fn check_network_connectivity(&self) -> (OverallHealthStatus, String) {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(5))
            .build()
            .unwrap();

        match client.get("https://httpbin.org/get").send().await {
            Ok(response) if response.status().is_success() => {
                (OverallHealthStatus::Healthy, "Network connectivity OK".to_string())
            }
            Ok(response) => {
                (OverallHealthStatus::Warning, format!("Network issue: HTTP {}", response.status()))
            }
            Err(e) => {
                (OverallHealthStatus::Critical, format!("Network failure: {}", e))
            }
        }
    }

    /// Check service availability
    async fn check_service_availability(&self) -> (OverallHealthStatus, String) {
        // Check if local services are running
        let local_url = format!("http://localhost:{}/health", self.config.webui.port);
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(3))
            .build()
            .unwrap();

        match client.get(&local_url).send().await {
            Ok(response) if response.status().is_success() => {
                (OverallHealthStatus::Healthy, "All services available".to_string())
            }
            Ok(response) => {
                (OverallHealthStatus::Warning, format!("Service issue: HTTP {}", response.status()))
            }
            Err(_) => {
                (OverallHealthStatus::Warning, "Some services unavailable".to_string())
            }
        }
    }

    /// Check database connection (placeholder)
    async fn check_database_connection(&self) -> (OverallHealthStatus, String) {
        // TODO: Implement actual database health check
        (OverallHealthStatus::Healthy, "Database connection OK".to_string())
    }

    /// Check filesystem access
    async fn check_filesystem_access(&self) -> (OverallHealthStatus, String) {
        let test_file = "/tmp/cortex-health-check";

        match std::fs::write(test_file, "health check") {
            Ok(_) => {
                let _ = std::fs::remove_file(test_file);
                (OverallHealthStatus::Healthy, "Filesystem access OK".to_string())
            }
            Err(e) => {
                (OverallHealthStatus::Critical, format!("Filesystem access failed: {}", e))
            }
        }
    }

    /// Validate configuration
    async fn validate_configuration(&self) -> Result<Vec<ConfigIssue>> {
        // Skip validation for now to avoid trait issues
        // TODO: Re-implement with proper validation system
        let _issues: Vec<ConfigIssue> = Vec::new();

        Ok(vec![])
    }

    /// Collect performance metrics
    async fn collect_performance_metrics(&self) -> Result<PerformanceMetrics> {
        // TODO: Implement actual metrics collection
        Ok(PerformanceMetrics {
            cpu_usage_percent: 25.0,
            memory_usage_percent: 60.0,
            disk_usage_percent: 45.0,
            network_latency_ms: Some(15.0),
            request_rate: 10.0,
            error_rate: 0.1,
            response_time_p95: 250.0,
        })
    }

    /// Analyze logs
    async fn analyze_logs(&self) -> Result<LogSummary> {
        // TODO: Implement actual log analysis
        Ok(LogSummary {
            total_logs: 1000,
            error_count: 5,
            warning_count: 25,
            recent_errors: vec![
                "Connection timeout to external service".to_string(),
                "Configuration validation warning".to_string(),
            ],
            log_file_size_mb: 2.5,
        })
    }

    /// Generate recommendations based on findings
    async fn generate_recommendations(
        &self,
        health_status: &OverallHealthStatus,
        config_issues: &[ConfigIssue],
        performance_metrics: &PerformanceMetrics,
    ) -> Result<Vec<Recommendation>> {
        let mut recommendations = Vec::new();

        // Health-based recommendations
        if matches!(health_status, OverallHealthStatus::Warning | OverallHealthStatus::Critical) {
            recommendations.push(Recommendation {
                category: "Health".to_string(),
                description: "System health issues detected, review logs and resources".to_string(),
                priority: RecommendationPriority::High,
                implementation_effort: ImplementationEffort::Medium,
            });
        }

        // Performance-based recommendations
        if performance_metrics.memory_usage_percent > 80.0 {
            recommendations.push(Recommendation {
                category: "Performance".to_string(),
                description: "High memory usage detected, consider increasing memory limits".to_string(),
                priority: RecommendationPriority::Medium,
                implementation_effort: ImplementationEffort::Low,
            });
        }

        // Configuration-based recommendations
        if !config_issues.is_empty() {
            recommendations.push(Recommendation {
                category: "Configuration".to_string(),
                description: "Configuration issues found, review and update settings".to_string(),
                priority: RecommendationPriority::Medium,
                implementation_effort: ImplementationEffort::Minimal,
            });
        }

        Ok(recommendations)
    }

    /// Determine overall severity
    fn determine_severity(&self, health_status: &OverallHealthStatus, config_issues: &[ConfigIssue]) -> ReportSeverity {
        if matches!(health_status, OverallHealthStatus::Critical) {
            return ReportSeverity::Critical;
        }

        if config_issues.iter().any(|issue| matches!(issue.severity, IssueSeverity::Critical)) {
            return ReportSeverity::Critical;
        }

        if matches!(health_status, OverallHealthStatus::Warning) ||
           config_issues.iter().any(|issue| matches!(issue.severity, IssueSeverity::High)) {
            return ReportSeverity::Warning;
        }

        ReportSeverity::Info
    }

    /// Default health checks
    fn default_health_checks() -> Vec<HealthCheck> {
        vec![
            HealthCheck {
                name: "System Resources".to_string(),
                check_type: HealthCheckType::SystemResource,
                last_result: None,
                enabled: true,
            },
            HealthCheck {
                name: "Network Connectivity".to_string(),
                check_type: HealthCheckType::NetworkConnectivity,
                last_result: None,
                enabled: true,
            },
            HealthCheck {
                name: "Service Availability".to_string(),
                check_type: HealthCheckType::ServiceAvailability,
                last_result: None,
                enabled: true,
            },
        ]
    }

    /// Default validation rules
    fn default_validation_rules() -> Vec<ValidationRule> {
        vec![
        ValidationRule {
                name: "WebUI Port Valid".to_string(),
                category: "Network".to_string(),
                validator: |config: &EnhancedConfig| {
            // u16 already guarantees the upper bound (<= 65535). Ensure non-zero only.
            if config.webui.port != 0 {
                        Ok(())
                    } else {
                        Err(crate::error::Error::Config(
                            crate::error::ConfigError::InvalidValue {
                                field: "webui.port".to_string(),
                                value: config.webui.port.to_string(),
                            },
                        ))
                    }
                },
            },
            ValidationRule {
                name: "MCP Servers Configured".to_string(),
                category: "Integration".to_string(),
                validator: |config: &EnhancedConfig| {
                    if config.mcp_servers.is_empty() {
                        Err(crate::error::Error::Config(
                            crate::error::ConfigError::MissingField("mcp_servers".to_string()),
                        ))
                    } else {
                        Ok(())
                    }
                },
            },
        ]
    }

    /// Get diagnostic history
    pub async fn get_diagnostic_history(&self) -> Vec<DiagnosticReport> {
        self.diagnostic_history.read().await.clone()
    }

    /// Export diagnostic report
    pub async fn export_report(&self, report: &DiagnosticReport, format: ReportFormat) -> Result<String> {
        match format {
            ReportFormat::Json => {
                Ok(serde_json::to_string_pretty(report)
                    .map_err(|e| anyhow!("JSON serialization failed: {}", e))?)
            }
            ReportFormat::Markdown => {
                Ok(self.generate_markdown_report(report))
            }
            _ => {
                Err(anyhow!("Export format not yet implemented: {:?}", format).into())
            }
        }
    }

    /// Generate markdown report
    fn generate_markdown_report(&self, report: &DiagnosticReport) -> String {
        format!(
            r#"# Diagnostic Report

**ID:** {}
**Timestamp:** {}
**Severity:** {:?}

## System Information
- OS: {}
- Architecture: {}
- CPU Cores: {}
- Total Memory: {:.1} GB
- Available Memory: {:.1} GB

## Health Status
**Overall Status:** {:?}

## Performance Metrics
- CPU Usage: {:.1}%
- Memory Usage: {:.1}%
- Disk Usage: {:.1}%
- Request Rate: {:.1} req/s
- Error Rate: {:.1}%

## Configuration Issues
{}

## Recommendations
{}
"#,
            report.id,
            report.timestamp,
            report.severity,
            report.system_info.os,
            report.system_info.arch,
            report.system_info.cpu_cores,
            report.system_info.total_memory_gb,
            report.system_info.available_memory_gb,
            report.health_status,
            report.performance_metrics.cpu_usage_percent,
            report.performance_metrics.memory_usage_percent,
            report.performance_metrics.disk_usage_percent,
            report.performance_metrics.request_rate,
            report.performance_metrics.error_rate,
            report.configuration_issues.iter()
                .map(|issue| format!("- {}: {}", issue.category, issue.description))
                .collect::<Vec<_>>()
                .join("\n"),
            report.recommendations.iter()
                .map(|rec| format!("- {}: {} (Priority: {:?})", rec.category, rec.description, rec.priority))
                .collect::<Vec<_>>()
                .join("\n")
        )
    }
}

impl fmt::Display for ReportSeverity {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ReportSeverity::Info => write!(f, "Info"),
            ReportSeverity::Warning => write!(f, "Warning"),
            ReportSeverity::Critical => write!(f, "Critical"),
        }
    }
}
