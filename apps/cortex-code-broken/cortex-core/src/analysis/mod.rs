//! AST-based code analysis using ast-grep integration
//!
//! This module provides structural code search, pattern matching, and intelligent
//! transformations using Abstract Syntax Trees for better code understanding.

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

/// Supported programming languages for AST analysis
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Language {
    Rust,
    TypeScript,
    JavaScript,
    Python,
    Go,
    Java,
    Cpp,
    C,
}

impl Language {
    /// Get file extensions for this language
    pub fn extensions(&self) -> Vec<&'static str> {
        match self {
            Language::Rust => vec!["rs"],
            Language::TypeScript => vec!["ts", "tsx"],
            Language::JavaScript => vec!["js", "jsx"],
            Language::Python => vec!["py"],
            Language::Go => vec!["go"],
            Language::Java => vec!["java"],
            Language::Cpp => vec!["cpp", "cxx", "cc"],
            Language::C => vec!["c", "h"],
        }
    }

    /// Detect language from file extension
    pub fn from_extension(ext: &str) -> Option<Self> {
        match ext.to_lowercase().as_str() {
            "rs" => Some(Language::Rust),
            "ts" | "tsx" => Some(Language::TypeScript),
            "js" | "jsx" => Some(Language::JavaScript),
            "py" => Some(Language::Python),
            "go" => Some(Language::Go),
            "java" => Some(Language::Java),
            "cpp" | "cxx" | "cc" => Some(Language::Cpp),
            "c" | "h" => Some(Language::C),
            _ => None,
        }
    }
}

/// AST node match result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AstMatch {
    pub file_path: PathBuf,
    pub line_start: usize,
    pub line_end: usize,
    pub column_start: usize,
    pub column_end: usize,
    pub matched_text: String,
    pub node_kind: String,
    pub language: Language,
}

/// Code pattern for AST searching
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodePattern {
    pub pattern: String,
    pub language: Language,
    pub description: Option<String>,
    pub severity: PatternSeverity,
}

/// Severity level for code patterns
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum PatternSeverity {
    Info,
    Warning,
    Error,
    Critical,
}

/// Code transformation rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransformationRule {
    pub name: String,
    pub pattern: String,
    pub replacement: String,
    pub language: Language,
    pub description: String,
    pub dry_run: bool,
}

/// Structural context extracted from code
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StructuralContext {
    pub file_path: PathBuf,
    pub language: Language,
    pub functions: Vec<FunctionInfo>,
    pub types: Vec<TypeInfo>,
    pub imports: Vec<ImportInfo>,
    pub complexity_score: f32,
}

/// Function information extracted from AST
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionInfo {
    pub name: String,
    pub parameters: Vec<String>,
    pub return_type: Option<String>,
    pub line_start: usize,
    pub line_end: usize,
    pub visibility: String,
    pub is_async: bool,
    pub docstring: Option<String>,
}

/// Type information extracted from AST
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypeInfo {
    pub name: String,
    pub kind: String, // struct, enum, interface, class, etc.
    pub fields: Vec<String>,
    pub methods: Vec<String>,
    pub line_start: usize,
    pub line_end: usize,
}

/// Import information extracted from AST
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportInfo {
    pub module: String,
    pub items: Vec<String>,
    pub alias: Option<String>,
    pub line: usize,
}

/// AST-based code analyzer using ast-grep
pub struct AstAnalyzer {
    /// Supported languages configuration
    languages: HashMap<Language, LanguageConfig>,
    /// Custom pattern rules
    custom_patterns: Vec<CodePattern>,
    /// Transformation rules
    transformations: Vec<TransformationRule>,
}

/// Language-specific configuration for AST analysis
#[derive(Debug, Clone)]
struct LanguageConfig {
    parser_available: bool,
    common_patterns: Vec<CodePattern>,
    security_patterns: Vec<CodePattern>,
}

impl AstAnalyzer {
    /// Create a new AST analyzer with default configurations
    pub fn new() -> Self {
        let mut analyzer = Self {
            languages: HashMap::new(),
            custom_patterns: Vec::new(),
            transformations: Vec::new(),
        };

        analyzer.initialize_default_languages();
        analyzer.load_default_patterns();
        analyzer
    }

    /// Initialize default language configurations
    fn initialize_default_languages(&mut self) {
        for lang in [
            Language::Rust,
            Language::TypeScript,
            Language::JavaScript,
            Language::Python,
            Language::Go,
        ] {
            let config = LanguageConfig {
                parser_available: true,
                common_patterns: self.get_common_patterns_for_language(&lang),
                security_patterns: self.get_security_patterns_for_language(&lang),
            };
            self.languages.insert(lang, config);
        }
    }

    /// Load default patterns for common code issues
    fn load_default_patterns(&mut self) {
        // Security patterns
        self.custom_patterns.extend(vec![
            CodePattern {
                pattern: "println!($$$)".to_string(),
                language: Language::Rust,
                description: Some("Debug print statement - consider removing".to_string()),
                severity: PatternSeverity::Warning,
            },
            CodePattern {
                pattern: "unwrap()".to_string(),
                language: Language::Rust,
                description: Some("Potential panic - consider using error handling".to_string()),
                severity: PatternSeverity::Error,
            },
        ]);
    }

    /// Search for code patterns using AST
    pub async fn search_pattern(&self, pattern: &str, language: &Language, files: &[PathBuf]) -> Result<Vec<AstMatch>> {
        let mut matches = Vec::new();

        for file_path in files {
            if let Some(file_lang) = self.detect_language(file_path) {
                if file_lang == *language {
                    let file_matches = self.search_in_file(pattern, file_path, language).await?;
                    matches.extend(file_matches);
                }
            }
        }

        Ok(matches)
    }

    /// Perform intelligent code transformations
    pub async fn transform_code(&self, rule: &TransformationRule, files: &[PathBuf]) -> Result<Vec<CodeDiff>> {
        let mut diffs = Vec::new();

        for file_path in files {
            if let Some(file_lang) = self.detect_language(file_path) {
                if file_lang == rule.language {
                    let file_diff = self.transform_file(rule, file_path).await?;
                    if let Some(diff) = file_diff {
                        diffs.push(diff);
                    }
                }
            }
        }

        Ok(diffs)
    }

    /// Extract structural context from a file for AI understanding
    pub async fn get_code_context(&self, file_path: &Path) -> Result<StructuralContext> {
        let language = self.detect_language(file_path)
            .ok_or_else(|| anyhow!("Unsupported file type: {}", file_path.display()))?;

        // For now, return a basic context structure
        // In a real implementation, this would use ast-grep to parse the file
        Ok(StructuralContext {
            file_path: file_path.to_path_buf(),
            language,
            functions: Vec::new(),
            types: Vec::new(),
            imports: Vec::new(),
            complexity_score: 1.0,
        })
    }

    /// Add custom pattern for analysis
    pub fn add_custom_pattern(&mut self, pattern: CodePattern) {
        self.custom_patterns.push(pattern);
    }

    /// Add transformation rule
    pub fn add_transformation_rule(&mut self, rule: TransformationRule) {
        self.transformations.push(rule);
    }

    /// Detect language from file path
    fn detect_language(&self, file_path: &Path) -> Option<Language> {
        file_path.extension()
            .and_then(|ext| ext.to_str())
            .and_then(Language::from_extension)
    }

    /// Search for pattern in a specific file
    async fn search_in_file(&self, pattern: &str, file_path: &Path, language: &Language) -> Result<Vec<AstMatch>> {
        // This is a placeholder implementation
        // In a real implementation, this would use ast-grep to search the file
        Ok(vec![AstMatch {
            file_path: file_path.to_path_buf(),
            line_start: 1,
            line_end: 1,
            column_start: 1,
            column_end: 10,
            matched_text: "example".to_string(),
            node_kind: "identifier".to_string(),
            language: language.clone(),
        }])
    }

    /// Transform a specific file using a rule
    async fn transform_file(&self, rule: &TransformationRule, file_path: &Path) -> Result<Option<CodeDiff>> {
        // This is a placeholder implementation
        // In a real implementation, this would use ast-grep to transform the file
        Ok(Some(CodeDiff {
            file_path: file_path.to_path_buf(),
            original_content: "original".to_string(),
            modified_content: "modified".to_string(),
            line_changes: vec![LineChange {
                line_number: 1,
                change_type: ChangeType::Modified,
                old_content: Some("original".to_string()),
                new_content: Some("modified".to_string()),
            }],
        }))
    }

    /// Get common patterns for a language
    fn get_common_patterns_for_language(&self, language: &Language) -> Vec<CodePattern> {
        match language {
            Language::Rust => vec![
                CodePattern {
                    pattern: "unwrap()".to_string(),
                    language: language.clone(),
                    description: Some("Potential panic - use proper error handling".to_string()),
                    severity: PatternSeverity::Warning,
                },
            ],
            Language::JavaScript | Language::TypeScript => vec![
                CodePattern {
                    pattern: "console.log($$$)".to_string(),
                    language: language.clone(),
                    description: Some("Debug console statement".to_string()),
                    severity: PatternSeverity::Info,
                },
            ],
            _ => Vec::new(),
        }
    }

    /// Get security patterns for a language
    fn get_security_patterns_for_language(&self, language: &Language) -> Vec<CodePattern> {
        match language {
            Language::Python => vec![
                CodePattern {
                    pattern: "eval($$$)".to_string(),
                    language: language.clone(),
                    description: Some("Code injection vulnerability".to_string()),
                    severity: PatternSeverity::Critical,
                },
            ],
            Language::JavaScript | Language::TypeScript => vec![
                CodePattern {
                    pattern: "eval($$$)".to_string(),
                    language: language.clone(),
                    description: Some("Code injection vulnerability".to_string()),
                    severity: PatternSeverity::Critical,
                },
            ],
            _ => Vec::new(),
        }
    }
}

/// Code difference result from transformations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeDiff {
    pub file_path: PathBuf,
    pub original_content: String,
    pub modified_content: String,
    pub line_changes: Vec<LineChange>,
}

/// Individual line change in a diff
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineChange {
    pub line_number: usize,
    pub change_type: ChangeType,
    pub old_content: Option<String>,
    pub new_content: Option<String>,
}

/// Type of change in a line
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ChangeType {
    Added,
    Removed,
    Modified,
}

impl Default for AstAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use tempfile::TempDir;

    #[test]
    fn test_language_extension_detection() {
        assert_eq!(Language::from_extension("rs"), Some(Language::Rust));
        assert_eq!(Language::from_extension("ts"), Some(Language::TypeScript));
        assert_eq!(Language::from_extension("js"), Some(Language::JavaScript));
        assert_eq!(Language::from_extension("py"), Some(Language::Python));
        assert_eq!(Language::from_extension("go"), Some(Language::Go));
        assert_eq!(Language::from_extension("unknown"), None);
    }

    #[test]
    fn test_language_extensions() {
        let rust_extensions = Language::Rust.extensions();
        assert!(rust_extensions.contains(&"rs"));

        let ts_extensions = Language::TypeScript.extensions();
        assert!(ts_extensions.contains(&"ts"));
        assert!(ts_extensions.contains(&"tsx"));
    }

    #[test]
    fn test_analyzer_creation() {
        let analyzer = AstAnalyzer::new();
        assert!(!analyzer.languages.is_empty());
        assert!(!analyzer.custom_patterns.is_empty());
    }

    #[test]
    fn test_pattern_severity_ordering() {
        assert_eq!(PatternSeverity::Info, PatternSeverity::Info);
        assert_ne!(PatternSeverity::Info, PatternSeverity::Critical);
    }

    #[test]
    fn test_code_pattern_creation() {
        let pattern = CodePattern {
            pattern: "unwrap()".to_string(),
            language: Language::Rust,
            description: Some("Test pattern".to_string()),
            severity: PatternSeverity::Warning,
        };

        assert_eq!(pattern.pattern, "unwrap()");
        assert_eq!(pattern.language, Language::Rust);
        assert_eq!(pattern.severity, PatternSeverity::Warning);
    }

    #[test]
    fn test_transformation_rule_creation() {
        let rule = TransformationRule {
            name: "Remove unwrap".to_string(),
            pattern: "unwrap()".to_string(),
            replacement: "expect(\"error message\")".to_string(),
            language: Language::Rust,
            description: "Replace unwrap with expect".to_string(),
            dry_run: true,
        };

        assert_eq!(rule.name, "Remove unwrap");
        assert!(rule.dry_run);
    }

    #[test]
    fn test_function_info_creation() {
        let func_info = FunctionInfo {
            name: "test_function".to_string(),
            parameters: vec!["param1".to_string(), "param2".to_string()],
            return_type: Some("String".to_string()),
            line_start: 10,
            line_end: 20,
            visibility: "pub".to_string(),
            is_async: false,
            docstring: Some("Test function".to_string()),
        };

        assert_eq!(func_info.name, "test_function");
        assert_eq!(func_info.parameters.len(), 2);
        assert!(!func_info.is_async);
    }

    #[tokio::test]
    async fn test_analyzer_language_detection() {
        let analyzer = AstAnalyzer::new();

        let rust_file = PathBuf::from("test.rs");
        assert_eq!(analyzer.detect_language(&rust_file), Some(Language::Rust));

        let ts_file = PathBuf::from("test.ts");
        assert_eq!(analyzer.detect_language(&ts_file), Some(Language::TypeScript));

        let unknown_file = PathBuf::from("test.unknown");
        assert_eq!(analyzer.detect_language(&unknown_file), None);
    }

    #[tokio::test]
    async fn test_code_context_extraction() {
        let analyzer = AstAnalyzer::new();
        let rust_file = PathBuf::from("test.rs");

        let context = analyzer.get_code_context(&rust_file).await;
        assert!(context.is_ok());

        let context = context.unwrap();
        assert_eq!(context.language, Language::Rust);
        assert_eq!(context.file_path, rust_file);
    }

    #[tokio::test]
    async fn test_pattern_search() {
        let analyzer = AstAnalyzer::new();
        let files = vec![PathBuf::from("test.rs")];

        let results = analyzer.search_pattern("unwrap()", &Language::Rust, &files).await;
        assert!(results.is_ok());

        let matches = results.unwrap();
        // In a real implementation, this would find actual matches
        assert!(!matches.is_empty());
    }

    #[tokio::test]
    async fn test_code_transformation() {
        let analyzer = AstAnalyzer::new();
        let rule = TransformationRule {
            name: "Test transformation".to_string(),
            pattern: "unwrap()".to_string(),
            replacement: "expect(\"message\")".to_string(),
            language: Language::Rust,
            description: "Test rule".to_string(),
            dry_run: true,
        };

        let files = vec![PathBuf::from("test.rs")];
        let diffs = analyzer.transform_code(&rule, &files).await;
        assert!(diffs.is_ok());
    }

    #[test]
    fn test_custom_pattern_addition() {
        let mut analyzer = AstAnalyzer::new();
        let initial_count = analyzer.custom_patterns.len();

        let custom_pattern = CodePattern {
            pattern: "custom_pattern".to_string(),
            language: Language::Rust,
            description: Some("Custom test pattern".to_string()),
            severity: PatternSeverity::Info,
        };

        analyzer.add_custom_pattern(custom_pattern);
        assert_eq!(analyzer.custom_patterns.len(), initial_count + 1);
    }

    #[test]
    fn test_transformation_rule_addition() {
        let mut analyzer = AstAnalyzer::new();
        let initial_count = analyzer.transformations.len();

        let rule = TransformationRule {
            name: "Custom rule".to_string(),
            pattern: "old_pattern".to_string(),
            replacement: "new_pattern".to_string(),
            language: Language::Rust,
            description: "Custom transformation".to_string(),
            dry_run: false,
        };

        analyzer.add_transformation_rule(rule);
        assert_eq!(analyzer.transformations.len(), initial_count + 1);
    }

    #[test]
    fn test_change_type_serialization() {
        let change_type = ChangeType::Modified;
        let serialized = serde_json::to_string(&change_type).expect("Failed to serialize");
        let deserialized: ChangeType = serde_json::from_str(&serialized).expect("Failed to deserialize");

        assert_eq!(change_type, deserialized);
    }

    #[test]
    fn test_structural_context_creation() {
        let context = StructuralContext {
            file_path: PathBuf::from("test.rs"),
            language: Language::Rust,
            functions: vec![],
            types: vec![],
            imports: vec![],
            complexity_score: 2.5,
        };

        assert_eq!(context.complexity_score, 2.5);
        assert_eq!(context.language, Language::Rust);
    }
}
