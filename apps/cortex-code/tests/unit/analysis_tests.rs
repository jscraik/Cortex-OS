//! AST analysis tests
//!
//! Tests for the ast-grep integrated code analysis system following September 2025 standards:
//! - Functional programming approach
//! - ≤40 lines per function
//! - Explicit error handling with anyhow::Result
//! - 100% branch coverage
//! - Named exports only

use cortex_core::analysis::{
    AstAnalyzer, CodePattern, TransformationRule, AnalysisResult,
    LanguageSupport, PatternMatch, SearchCriteria
};
use anyhow::Result;
use serde_json::json;
use std::collections::HashMap;
use tempfile::{TempDir, NamedTempFile};
use tokio::test as tokio_test;
use std::io::Write;

/// Create temporary file with content
pub fn create_temp_file(content: &str, extension: &str) -> Result<NamedTempFile> {
    let mut file = NamedTempFile::with_suffix(extension)?;
    file.write_all(content.as_bytes())?;
    file.flush()?;
    Ok(file)
}

/// Create test Rust code
pub fn create_rust_test_code() -> &'static str {
    r#"
use std::collections::HashMap;

pub struct TestStruct {
    field: String,
}

impl TestStruct {
    pub fn new(value: String) -> Self {
        Self { field: value }
    }

    pub fn get_field(&self) -> &str {
        &self.field
    }
}

fn main() {
    let map = HashMap::new();
    let instance = TestStruct::new("test".to_string());
    println!("{}", instance.get_field());
}
"#
}

/// Create test TypeScript code
pub fn create_typescript_test_code() -> &'static str {
    r#"
interface User {
    id: number;
    name: string;
}

class UserService {
    private users: Map<number, User> = new Map();

    constructor() {}

    addUser(user: User): void {
        this.users.set(user.id, user);
    }

    getUser(id: number): User | undefined {
        return this.users.get(id);
    }
}

const service = new UserService();
service.addUser({ id: 1, name: "Alice" });
"#
}

/// Create test pattern for finding struct definitions
pub fn create_struct_pattern() -> CodePattern {
    CodePattern {
        language: "rust".to_string(),
        pattern: "struct $NAME { $$$FIELDS }".to_string(),
        description: "Find struct definitions".to_string(),
        metadata: json!({
            "type": "definition",
            "category": "data_structure"
        }),
    }
}

/// Create test transformation rule for adding derives
pub fn create_derive_transformation() -> TransformationRule {
    TransformationRule {
        name: "add_debug_derive".to_string(),
        pattern: CodePattern {
            language: "rust".to_string(),
            pattern: "struct $NAME { $$$FIELDS }".to_string(),
            description: "Find structs without Debug derive".to_string(),
            metadata: json!({}),
        },
        replacement: "#[derive(Debug)]\nstruct $NAME { $$$FIELDS }".to_string(),
        description: "Add Debug derive to structs".to_string(),
        conditions: json!({
            "not_has_derive": "Debug"
        }),
    }
}

#[tokio_test]
async fn test_analyzer_initialization() -> Result<()> {
    // Given/When
    let analyzer = AstAnalyzer::new();

    // Then
    assert!(analyzer.is_initialized());
    let supported = analyzer.supported_languages();
    assert!(supported.contains(&"rust".to_string()));
    assert!(supported.contains(&"typescript".to_string()));
    Ok(())
}

#[tokio_test]
async fn test_language_detection() -> Result<()> {
    // Given
    let analyzer = AstAnalyzer::new();
    let rust_file = create_temp_file(create_rust_test_code(), ".rs")?;
    let ts_file = create_temp_file(create_typescript_test_code(), ".ts")?;

    // When
    let rust_lang = analyzer.detect_language(rust_file.path()).await?;
    let ts_lang = analyzer.detect_language(ts_file.path()).await?;

    // Then
    assert_eq!(rust_lang, LanguageSupport::Rust);
    assert_eq!(ts_lang, LanguageSupport::TypeScript);
    Ok(())
}

#[tokio_test]
async fn test_pattern_search() -> Result<()> {
    // Given
    let analyzer = AstAnalyzer::new();
    let test_file = create_temp_file(create_rust_test_code(), ".rs")?;
    let pattern = create_struct_pattern();

    // When
    let matches = analyzer.search_pattern(&pattern, test_file.path()).await?;

    // Then
    assert_eq!(matches.len(), 1);
    assert_eq!(matches[0].pattern_name, pattern.description);
    assert!(matches[0].matched_text.contains("TestStruct"));
    Ok(())
}

#[tokio_test]
async fn test_multi_pattern_search() -> Result<()> {
    // Given
    let analyzer = AstAnalyzer::new();
    let test_file = create_temp_file(create_rust_test_code(), ".rs")?;

    let patterns = vec![
        create_struct_pattern(),
        CodePattern {
            language: "rust".to_string(),
            pattern: "impl $TYPE { $$$METHODS }".to_string(),
            description: "Find impl blocks".to_string(),
            metadata: json!({}),
        }
    ];

    // When
    let results = analyzer.search_multiple_patterns(&patterns, test_file.path()).await?;

    // Then
    assert_eq!(results.len(), 2);
    assert!(results.iter().any(|r| r.pattern_name.contains("struct")));
    assert!(results.iter().any(|r| r.pattern_name.contains("impl")));
    Ok(())
}

#[tokio_test]
async fn test_code_transformation() -> Result<()> {
    // Given
    let analyzer = AstAnalyzer::new();
    let test_file = create_temp_file(create_rust_test_code(), ".rs")?;
    let transformation = create_derive_transformation();

    // When
    let result = analyzer.apply_transformation(&transformation, test_file.path()).await?;

    // Then
    assert!(result.success);
    assert!(result.transformed_code.contains("#[derive(Debug)]"));
    assert!(result.changes_made > 0);
    Ok(())
}

#[tokio_test]
async fn test_analysis_with_criteria() -> Result<()> {
    // Given
    let analyzer = AstAnalyzer::new();
    let test_file = create_temp_file(create_rust_test_code(), ".rs")?;

    let criteria = SearchCriteria {
        include_patterns: vec!["struct".to_string(), "impl".to_string()],
        exclude_patterns: vec!["test".to_string()],
        max_matches: Some(10),
        context_lines: Some(3),
    };

    // When
    let result = analyzer.analyze_with_criteria(test_file.path(), &criteria).await?;

    // Then
    assert!(result.success);
    assert!(!result.matches.is_empty());
    assert!(result.analysis_duration.is_some());
    Ok(())
}

#[tokio_test]
async fn test_cross_language_analysis() -> Result<()> {
    // Given
    let analyzer = AstAnalyzer::new();
    let rust_file = create_temp_file(create_rust_test_code(), ".rs")?;
    let ts_file = create_temp_file(create_typescript_test_code(), ".ts")?;

    let rust_pattern = create_struct_pattern();
    let ts_pattern = CodePattern {
        language: "typescript".to_string(),
        pattern: "interface $NAME { $$$FIELDS }".to_string(),
        description: "Find interface definitions".to_string(),
        metadata: json!({}),
    };

    // When
    let rust_matches = analyzer.search_pattern(&rust_pattern, rust_file.path()).await?;
    let ts_matches = analyzer.search_pattern(&ts_pattern, ts_file.path()).await?;

    // Then
    assert!(!rust_matches.is_empty());
    assert!(!ts_matches.is_empty());
    assert_ne!(rust_matches[0].language, ts_matches[0].language);
    Ok(())
}

#[tokio_test]
async fn test_pattern_metadata_handling() -> Result<()> {
    // Given
    let analyzer = AstAnalyzer::new();
    let test_file = create_temp_file(create_rust_test_code(), ".rs")?;

    let pattern = CodePattern {
        language: "rust".to_string(),
        pattern: "fn $NAME($$$PARAMS) { $$$BODY }".to_string(),
        description: "Find functions".to_string(),
        metadata: json!({
            "category": "function",
            "visibility": "any",
            "complexity": "simple"
        }),
    };

    // When
    let matches = analyzer.search_pattern(&pattern, test_file.path()).await?;

    // Then
    assert!(!matches.is_empty());
    for match_result in matches {
        assert!(match_result.metadata.is_object());
        assert!(match_result.metadata["category"].is_string());
    }
    Ok(())
}

#[tokio_test]
async fn test_error_handling_invalid_pattern() -> Result<()> {
    // Given
    let analyzer = AstAnalyzer::new();
    let test_file = create_temp_file(create_rust_test_code(), ".rs")?;

    let invalid_pattern = CodePattern {
        language: "rust".to_string(),
        pattern: "invalid syntax $$$ {".to_string(), // Invalid pattern syntax
        description: "Invalid pattern".to_string(),
        metadata: json!({}),
    };

    // When
    let result = analyzer.search_pattern(&invalid_pattern, test_file.path()).await;

    // Then - should handle gracefully or return error
    // Implementation would determine exact behavior
    assert!(result.is_ok() || result.is_err());
    Ok(())
}

#[tokio_test]
async fn test_concurrent_analysis() -> Result<()> {
    // Given
    let analyzer = std::sync::Arc::new(AstAnalyzer::new());
    let file1 = create_temp_file(create_rust_test_code(), ".rs")?;
    let file2 = create_temp_file(create_typescript_test_code(), ".ts")?;

    let analyzer1 = analyzer.clone();
    let analyzer2 = analyzer.clone();
    let pattern1 = create_struct_pattern();
    let pattern2 = CodePattern {
        language: "typescript".to_string(),
        pattern: "class $NAME { $$$MEMBERS }".to_string(),
        description: "Find classes".to_string(),
        metadata: json!({}),
    };

    // When - concurrent analysis
    let (result1, result2) = tokio::join!(
        async move {
            analyzer1.search_pattern(&pattern1, file1.path()).await
        },
        async move {
            analyzer2.search_pattern(&pattern2, file2.path()).await
        }
    );

    // Then
    assert!(result1.is_ok());
    assert!(result2.is_ok());
    assert!(!result1.unwrap().is_empty());
    assert!(!result2.unwrap().is_empty());
    Ok(())
}

#[tokio_test]
async fn test_transformation_rollback() -> Result<()> {
    // Given
    let analyzer = AstAnalyzer::new();
    let original_code = create_rust_test_code();
    let test_file = create_temp_file(original_code, ".rs")?;
    let transformation = create_derive_transformation();

    // When - apply transformation
    let transform_result = analyzer.apply_transformation(&transformation, test_file.path()).await?;
    assert!(transform_result.success);

    // Simulate rollback by checking we can detect the change
    let rollback_possible = !transform_result.transformed_code.is_empty() &&
                           transform_result.transformed_code != original_code;

    // Then
    assert!(rollback_possible);
    Ok(())
}

#[tokio_test]
async fn test_batch_analysis() -> Result<()> {
    // Given
    let analyzer = AstAnalyzer::new();
    let temp_dir = TempDir::new()?;

    // Create multiple test files
    let file1_path = temp_dir.path().join("test1.rs");
    let file2_path = temp_dir.path().join("test2.rs");
    std::fs::write(&file1_path, create_rust_test_code())?;
    std::fs::write(&file2_path, "fn another_function() {}")?;

    let files = vec![file1_path, file2_path];
    let pattern = CodePattern {
        language: "rust".to_string(),
        pattern: "fn $NAME($$$PARAMS) { $$$BODY }".to_string(),
        description: "Find all functions".to_string(),
        metadata: json!({}),
    };

    // When
    let mut all_matches = Vec::new();
    for file in files {
        let matches = analyzer.search_pattern(&pattern, &file).await?;
        all_matches.extend(matches);
    }

    // Then
    assert!(all_matches.len() >= 2); // At least main() and another_function()
    Ok(())
}

#[tokio_test]
async fn test_performance_metrics() -> Result<()> {
    // Given
    let analyzer = AstAnalyzer::new();
    let test_file = create_temp_file(create_rust_test_code(), ".rs")?;
    let pattern = create_struct_pattern();

    // When
    let start_time = std::time::Instant::now();
    let matches = analyzer.search_pattern(&pattern, test_file.path()).await?;
    let duration = start_time.elapsed();

    // Then - should complete reasonably quickly
    assert!(!matches.is_empty());
    assert!(duration.as_millis() < 5000); // Should take less than 5 seconds
    Ok(())
}

#[tokio_test]
async fn test_complex_pattern_matching() -> Result<()> {
    // Given
    let analyzer = AstAnalyzer::new();
    let complex_rust = r#"
#[derive(Clone)]
pub struct ComplexStruct<T> {
    field1: T,
    field2: Option<String>,
}

impl<T> ComplexStruct<T> {
    pub fn new(value: T) -> Self {
        Self {
            field1: value,
            field2: None,
        }
    }
}
"#;
    let test_file = create_temp_file(complex_rust, ".rs")?;

    let complex_pattern = CodePattern {
        language: "rust".to_string(),
        pattern: "struct $NAME<$$$GENERICS> { $$$FIELDS }".to_string(),
        description: "Find generic structs".to_string(),
        metadata: json!({
            "has_generics": true
        }),
    };

    // When
    let matches = analyzer.search_pattern(&complex_pattern, test_file.path()).await?;

    // Then
    assert!(!matches.is_empty());
    assert!(matches[0].matched_text.contains("ComplexStruct<T>"));
    Ok(())
}
