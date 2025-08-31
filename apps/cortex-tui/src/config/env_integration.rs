/// Enhanced environment variable integration for all configuration fields
/// Inspired by OpenAI Codex's comprehensive env var support
use serde_json::Value;
use std::collections::HashMap;
use std::env;

/// Environment variable prefix for all Cortex TUI config
const ENV_PREFIX: &str = "CORTEX";

/// Enhanced environment variable resolver that can override any config field
pub struct EnvResolver {
    env_vars: HashMap<String, String>,
}

impl EnvResolver {
    pub fn new() -> Self {
        let mut env_vars = HashMap::new();
        
        // Collect all environment variables with the CORTEX prefix
        for (key, value) in env::vars() {
            if key.starts_with(ENV_PREFIX) {
                env_vars.insert(key, value);
            }
        }
        
        Self { env_vars }
    }
    
    /// Apply environment variable overrides to a configuration value
    pub fn apply_env_overrides(&self, mut config: serde_json::Value) -> serde_json::Value {
        // Apply overrides recursively
        self.apply_recursive(&mut config, String::new());
        config
    }
    
    fn apply_recursive(&self, value: &mut Value, path: String) {
        match value {
            Value::Object(obj) => {
                for (key, val) in obj.iter_mut() {
                    let new_path = if path.is_empty() {
                        key.clone()
                    } else {
                        format!("{}_{}", path, key)
                    };
                    
                    // Check for direct environment variable override
                    let env_key = format!("{}_{}", ENV_PREFIX, new_path.to_uppercase());
                    if let Some(env_val) = self.env_vars.get(&env_key) {
                        *val = self.parse_env_value(env_val);
                        continue;
                    }
                    
                    // Recurse into nested objects/arrays
                    self.apply_recursive(val, new_path);
                }
            }
            Value::Array(arr) => {
                for (i, item) in arr.iter_mut().enumerate() {
                    let new_path = format!("{}_{}", path, i);
                    self.apply_recursive(item, new_path);
                }
            }
            _ => {}
        }
    }
    
    fn parse_env_value(&self, env_val: &str) -> Value {
        // Try to parse as JSON first
        if let Ok(json_val) = serde_json::from_str(env_val) {
            return json_val;
        }
        
        // Parse as specific types
        if let Ok(bool_val) = env_val.parse::<bool>() {
            return Value::Bool(bool_val);
        }
        
        if let Ok(int_val) = env_val.parse::<i64>() {
            return Value::Number(int_val.into());
        }
        
        if let Ok(float_val) = env_val.parse::<f64>() {
            if let Some(num) = serde_json::Number::from_f64(float_val) {
                return Value::Number(num);
            }
        }
        
        // Default to string
        Value::String(env_val.to_string())
    }
    
    /// Get commonly used environment variables with fallbacks
    pub fn get_provider_credentials() -> ProviderCredentials {
        ProviderCredentials {
            github_token: env::var("GITHUB_TOKEN").ok()
                .or_else(|| env::var("CORTEX_GITHUB_TOKEN").ok()),
                
            openai_api_key: env::var("OPENAI_API_KEY").ok()
                .or_else(|| env::var("CORTEX_OPENAI_API_KEY").ok()),
                
            anthropic_api_key: env::var("ANTHROPIC_API_KEY").ok()
                .or_else(|| env::var("CORTEX_ANTHROPIC_API_KEY").ok()),
                
            // Custom provider endpoints
            github_endpoint: env::var("CORTEX_GITHUB_ENDPOINT").ok(),
            openai_endpoint: env::var("CORTEX_OPENAI_ENDPOINT").ok(),
            anthropic_endpoint: env::var("CORTEX_ANTHROPIC_ENDPOINT").ok(),
            
            // Runtime configuration
            default_provider: env::var("CORTEX_DEFAULT_PROVIDER").ok(),
            debug_mode: env::var("CORTEX_DEBUG").ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(false),
            daemon_port: env::var("CORTEX_DAEMON_PORT").ok()
                .and_then(|v| v.parse().ok()),
            bind_address: env::var("CORTEX_BIND_ADDRESS").ok(),
            
            // Security settings
            tls_enabled: env::var("CORTEX_TLS_ENABLED").ok()
                .and_then(|v| v.parse().ok()),
            cors_origins: env::var("CORTEX_CORS_ORIGINS").ok()
                .map(|s| s.split(',').map(|s| s.trim().to_string()).collect()),
                
            // Memory and privacy
            memory_disabled: env::var("CORTEX_MEMORY_DISABLED").ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(false),
            telemetry_disabled: env::var("CORTEX_TELEMETRY_DISABLED").ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(false),
        }
    }
}

/// Strongly-typed provider credentials from environment
#[derive(Debug, Clone)]
pub struct ProviderCredentials {
    // API Keys
    pub github_token: Option<String>,
    pub openai_api_key: Option<String>,
    pub anthropic_api_key: Option<String>,
    
    // Custom endpoints
    pub github_endpoint: Option<String>,
    pub openai_endpoint: Option<String>, 
    pub anthropic_endpoint: Option<String>,
    
    // Runtime configuration
    pub default_provider: Option<String>,
    pub debug_mode: bool,
    pub daemon_port: Option<u16>,
    pub bind_address: Option<String>,
    
    // Security
    pub tls_enabled: Option<bool>,
    pub cors_origins: Option<Vec<String>>,
    
    // Privacy
    pub memory_disabled: bool,
    pub telemetry_disabled: bool,
}

impl Default for EnvResolver {
    fn default() -> Self {
        Self::new()
    }
}

/// Configuration profile support - allows multiple named configurations
pub struct ProfileManager {
    current_profile: String,
}

impl ProfileManager {
    pub fn new() -> Self {
        let current_profile = env::var("CORTEX_PROFILE")
            .unwrap_or_else(|_| "default".to_string());
            
        Self { current_profile }
    }
    
    pub fn get_current_profile(&self) -> &str {
        &self.current_profile
    }
    
    pub fn get_profile_config_path(&self) -> std::path::PathBuf {
        let home = directories::UserDirs::new()
            .map(|dirs| dirs.home_dir().to_path_buf())
            .unwrap_or_default();
            
        home.join(".cortex")
            .join("profiles")
            .join(format!("{}.json", self.current_profile))
    }
    
    pub fn list_available_profiles() -> std::io::Result<Vec<String>> {
        let home = directories::UserDirs::new()
            .map(|dirs| dirs.home_dir().to_path_buf())
            .unwrap_or_default();
            
        let profiles_dir = home.join(".cortex").join("profiles");
        
        if !profiles_dir.exists() {
            return Ok(vec!["default".to_string()]);
        }
        
        let mut profiles = vec![];
        for entry in std::fs::read_dir(profiles_dir)? {
            let entry = entry?;
            if let Some(name) = entry.file_name().to_str() {
                if name.ends_with(".json") {
                    let profile_name = name.strip_suffix(".json").unwrap_or(name);
                    profiles.push(profile_name.to_string());
                }
            }
        }
        
        if profiles.is_empty() {
            profiles.push("default".to_string());
        }
        
        Ok(profiles)
    }
}

impl Default for ProfileManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    
    #[test]
    fn test_env_value_parsing() {
        let resolver = EnvResolver::new();
        
        // Test JSON parsing
        assert_eq!(resolver.parse_env_value("true"), Value::Bool(true));
        assert_eq!(resolver.parse_env_value("42"), Value::Number(42.into()));
        assert_eq!(resolver.parse_env_value("3.14"), 
                   Value::Number(serde_json::Number::from_f64(3.14).unwrap()));
        assert_eq!(resolver.parse_env_value("\"hello\""), Value::String("hello".to_string()));
        
        // Test array parsing
        let array_result = resolver.parse_env_value("[1,2,3]");
        assert_eq!(array_result, json!([1, 2, 3]));
    }
    
    #[test]
    fn test_profile_manager() {
        std::env::set_var("CORTEX_PROFILE", "test");
        let manager = ProfileManager::new();
        assert_eq!(manager.get_current_profile(), "test");
        std::env::remove_var("CORTEX_PROFILE");
    }
}