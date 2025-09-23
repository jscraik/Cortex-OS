//! MCP Tools for cortex-code
//!
//! This module provides a comprehensive set of MCP tools that expose
//! cortex-code's capabilities including file operations, code analysis,
//! patch application, and file searching.

use anyhow::Result;
use mcp_types::{CallToolResult, ContentBlock, TextContent, Tool, ToolInputSchema};
use serde_json::Value;
use std::collections::HashMap;
use std::path::Path;
use tokio::fs;

/// Extension trait for anyhow::Error to convert to CallToolResult
trait ErrorExt {
    fn into_call_tool_result(self) -> CallToolResult;
}

impl ErrorExt for anyhow::Error {
    fn into_call_tool_result(self) -> CallToolResult {
        CallToolResult {
            content: vec![ContentBlock::TextContent(TextContent {
                text: format!("{, r#type: "text".to_string(), annotations: None }", self),
                r#type: "text".to_string(),
                annotations: None,
            })],
            is_error: Some(true),
            structured_content: None,
        }
    }
}

/// Enum containing all possible MCP tools
#[derive(Debug)]
pub enum McpToolEnum {
    Echo(EchoTool),
    FileOperations(FileOperationsTool),
    FileSearch(FileSearchTool),
    ApplyPatch(ApplyPatchTool),
    CodeAnalysis(CodeAnalysisTool),
}

impl McpToolEnum {
    pub fn name(&self) -> &str {
        match self {
            McpToolEnum::Echo(tool) => tool.name(),
            McpToolEnum::FileOperations(tool) => tool.name(),
            McpToolEnum::FileSearch(tool) => tool.name(),
            McpToolEnum::ApplyPatch(tool) => tool.name(),
            McpToolEnum::CodeAnalysis(tool) => tool.name(),
        }
    }

    pub fn definition(&self) -> Tool {
        match self {
            McpToolEnum::Echo(tool) => tool.definition(),
            McpToolEnum::FileOperations(tool) => tool.definition(),
            McpToolEnum::FileSearch(tool) => tool.definition(),
            McpToolEnum::ApplyPatch(tool) => tool.definition(),
            McpToolEnum::CodeAnalysis(tool) => tool.definition(),
        }
    }

    pub async fn call(&self, arguments: Value) -> Result<CallToolResult> {
        match self {
            McpToolEnum::Echo(tool) => tool.call(arguments).await,
            McpToolEnum::FileOperations(tool) => tool.call(arguments).await,
            McpToolEnum::FileSearch(tool) => tool.call(arguments).await,
            McpToolEnum::ApplyPatch(tool) => tool.call(arguments).await,
            McpToolEnum::CodeAnalysis(tool) => tool.call(arguments).await,
        }
    }
}

/// Tool registry for managing MCP tools
pub struct ToolRegistry {
    tools: HashMap<String, McpToolEnum>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        let mut registry = Self {
            tools: HashMap::new(),
        };

        // Register built-in tools
        registry.register_tool(McpToolEnum::Echo(EchoTool::default()));
        registry.register_tool(McpToolEnum::FileOperations(FileOperationsTool));
        registry.register_tool(McpToolEnum::FileSearch(FileSearchTool));
        registry.register_tool(McpToolEnum::ApplyPatch(ApplyPatchTool));
        registry.register_tool(McpToolEnum::CodeAnalysis(CodeAnalysisTool));

        registry
    }

    pub fn register_tool(&mut self, tool: McpToolEnum) {
        let name = tool.name().to_string();
        self.tools.insert(name, tool);
    }

    pub fn list_tools(&self) -> Vec<Tool> {
        self.tools.values().map(|tool| tool.definition()).collect()
    }

    pub async fn call_tool(&self, name: &str, arguments: Value) -> Option<Result<CallToolResult>> {
        if let Some(tool) = self.tools.get(name) {
            Some(tool.call(arguments).await)
        } else {
            None
        }
    }
}

/// Trait for MCP tools
pub trait McpTool {
    fn name(&self) -> &str;
    fn definition(&self) -> Tool;
    async fn call(&self, arguments: Value) -> Result<CallToolResult>;
}

/// Helper function to create TextContent with required fields
fn create_text_content(text: String) -> TextContent {
    TextContent {
        text,
        r#type: "text".to_string(),
        annotations: None,
    }
}

/// Echo tool for testing
#[derive(Default, Debug)]
pub struct EchoTool;

impl McpTool for EchoTool {
    fn name(&self) -> &str {
        "echo"
    }

    fn definition(&self) -> Tool {
        Tool {
            name: "echo".to_string(),
            title: Some("Echo".to_string()),
            description: Some("Echo back the provided message".to_string()),
            annotations: None,
            input_schema: ToolInputSchema {
                r#type: "object".to_string(),
                properties: Some(serde_json::json!({
                    "message": {
                        "type": "string",
                        "description": "Message to echo back"
                    }
                })),
                required: Some(vec!["message".to_string()]),
            },
            output_schema: None,
        }
    }

    async fn call(&self, arguments: Value) -> Result<CallToolResult> {
        let message = arguments
            .get("message")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("invalid input: missing 'message' field"))?;

        Ok(CallToolResult {
            content: vec![ContentBlock::TextContent(TextContent {
                text: message.to_string(),
                r#type: "text".to_string(),
                annotations: None,
            })],
            is_error: None,
            structured_content: None,
        })
    }
}

/// File operations tool
#[derive(Debug)]
pub struct FileOperationsTool;

impl McpTool for FileOperationsTool {
    fn name(&self) -> &str {
        "file_operations"
    }

    fn definition(&self) -> Tool {
        Tool {
            name: "file_operations".to_string(),
            title: Some("File Operations".to_string()),
            description: Some(
                "Perform file system operations (read, write, list, create directories)"
                    .to_string(),
            ),
            annotations: None,
            input_schema: ToolInputSchema {
                r#type: "object".to_string(),
                properties: Some(serde_json::json!({
                    "operation": {
                        "type": "string",
                        "enum": ["read", "write", "list", "create_dir"],
                        "description": "Operation to perform"
                    },
                    "path": {
                        "type": "string",
                        "description": "File or directory path"
                    },
                    "content": {
                        "type": "string",
                        "description": "Content to write (for write operation)"
                    }
                })),
                required: Some(vec!["operation".to_string(), "path".to_string()]),
            },
            output_schema: None,
        }
    }

    async fn call(&self, arguments: Value) -> Result<CallToolResult> {
        let operation = arguments
            .get("operation")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("missing 'operation' field"))?;

        let path_str = arguments
            .get("path")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("missing 'path' field"))?;

        let path = Path::new(path_str);

        match operation {
            "read" => match tokio::fs::read_to_string(path).await {
                Ok(content) => Ok(CallToolResult {
                    content: vec![ContentBlock::TextContent(TextContent {
                        text: content,
                        r#type: "text".to_string(),
                        annotations: None,
                    })],
                    is_error: None,
                    structured_content: None,
                }),
                Err(e) => Ok(CallToolResult {
                    content: vec![ContentBlock::TextContent(TextContent {
                        text: format!("Error reading file: {}", e),
                        r#type: "text".to_string(),
                        annotations: None,
                    })],
                    is_error: Some(true),
                    structured_content: None,
                }),
            },
            "write" => {
                let content = arguments
                    .get("content")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| {
                        anyhow::anyhow!("missing 'content' field for write operation")
                    })?;

                match tokio::fs::write(path, content).await {
                    Ok(()) => Ok(CallToolResult {
                        content: vec![ContentBlock::TextContent(TextContent {
                            text: format!("Successfully wrote to {}", path_str),
                            r#type: "text".to_string(),
                            annotations: None,
                        })],
                        is_error: None,
                        structured_content: None,
                    }),
                    Err(e) => Ok(CallToolResult {
                        content: vec![ContentBlock::TextContent(TextContent {
                            text: format!("Error writing file: {}", e),
                            r#type: "text".to_string(),
                            annotations: None,
                        })],
                        is_error: Some(true),
                        structured_content: None,
                    }),
                }
            }
            "list" => match tokio::fs::read_dir(path).await {
                Ok(mut entries) => {
                    let mut items = Vec::new();
                    while let Ok(Some(entry)) = entries.next_entry().await {
                        if let Ok(name) = entry.file_name().into_string() {
                            let is_dir = entry
                                .file_type()
                                .await
                                .map(|ft| ft.is_dir())
                                .unwrap_or(false);
                            items.push(format!("{}{}", name, if is_dir { "/" } else { "" }));
                        }
                    }
                    Ok(CallToolResult {
                        content: vec![ContentBlock::TextContent(TextContent {
                            text: items.join("\n"),
                            r#type: "text".to_string(),
                            annotations: None,
                        })],
                        is_error: None,
                        structured_content: None,
                    })
                }
                Err(e) => Ok(CallToolResult {
                    content: vec![ContentBlock::TextContent(TextContent {
                        text: format!("Error listing directory: {}", e),
                        r#type: "text".to_string(),
                        annotations: None,
                    })],
                    is_error: Some(true),
                    structured_content: None,
                }),
            },
            "create_dir" => match tokio::fs::create_dir_all(path).await {
                Ok(()) => Ok(CallToolResult {
                    content: vec![ContentBlock::TextContent(TextContent {
                        text: format!("Successfully created directory {}", path_str),
                        r#type: "text".to_string(),
                        annotations: None,
                    })],
                    is_error: None,
                    structured_content: None,
                }),
                Err(e) => Ok(CallToolResult {
                    content: vec![ContentBlock::TextContent(TextContent {
                        text: format!("Error creating directory: {}", e),
                        r#type: "text".to_string(),
                        annotations: None,
                    })],
                    is_error: Some(true),
                    structured_content: None,
                }),
            },
            _ => Ok(CallToolResult {
                content: vec![ContentBlock::TextContent(TextContent {
                    text: format!("Unknown operation: {}", operation),
                    r#type: "text".to_string(),
                    annotations: None,
                })],
                is_error: Some(true),
                structured_content: None,
            }),
        }
    }
}

/// File search tool
#[derive(Debug)]
pub struct FileSearchTool;

impl McpTool for FileSearchTool {
    fn name(&self) -> &str {
        "file_search"
    }

    fn definition(&self) -> Tool {
        Tool {
            name: "file_search".to_string(),
            title: Some("File Search".to_string()),
            description: Some("Search for files by name pattern using fuzzy matching".to_string()),
            annotations: None,
            input_schema: ToolInputSchema {
                r#type: "object".to_string(),
                properties: Some(serde_json::json!({
                    "pattern": {
                        "type": "string",
                        "description": "Search pattern for file names"
                    },
                    "directory": {
                        "type": "string",
                        "description": "Directory to search in (default: current directory)"
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Maximum number of results (default: 100)"
                    }
                })),
                required: Some(vec!["pattern".to_string()]),
            },
            output_schema: None,
        }
    }

    async fn call(&self, arguments: Value) -> Result<CallToolResult> {
        let pattern = arguments
            .get("pattern")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("missing 'pattern' field"))?;

        let directory = arguments
            .get("directory")
            .and_then(|v| v.as_str())
            .unwrap_or(".");

        let max_results = arguments
            .get("max_results")
            .and_then(|v| v.as_u64())
            .unwrap_or(100) as usize;

        // Simple file search implementation for now
        // TODO: Use the actual codex_file_search crate when build issues are resolved
        let mut results = Vec::new();

        match fs::read_dir(directory).await {
            Ok(mut entries) => {
                while let Ok(Some(entry)) = entries.next_entry().await {
                    if let Ok(name) = entry.file_name().into_string() {
                        if name.to_lowercase().contains(&pattern.to_lowercase()) {
                            results.push(format!("{} (score: 100)", name));
                            if results.len() >= max_results {
                                break;
                            }
                        }
                    }
                }
            }
            Err(e) => {
                return Ok(CallToolResult {
                    content: vec![ContentBlock::TextContent(TextContent {
                        text: format!("Error reading directory: {}", e),
                        r#type: "text".to_string(),
                        annotations: None,
                    })],
                    is_error: Some(true),
                    structured_content: None,
                });
            }
        }

        Ok(CallToolResult {
            content: vec![ContentBlock::TextContent(TextContent {
                text: if results.is_empty() {
                    "No files found matching the pattern".to_string()
                } else {
                    results.join("\n")
                },
                r#type: "text".to_string(),
                annotations: None,
            })],
            is_error: None,
            structured_content: None,
        })
    }
}

/// Apply patch tool
#[derive(Debug)]
pub struct ApplyPatchTool;

impl McpTool for ApplyPatchTool {
    fn name(&self) -> &str {
        "apply_patch"
    }

    fn definition(&self) -> Tool {
        Tool {
            name: "apply_patch".to_string(),
            title: Some("Apply Patch".to_string()),
            description: Some(
                "Apply a patch to modify files using unified diff format".to_string(),
            ),
            annotations: None,
            input_schema: ToolInputSchema {
                r#type: "object".to_string(),
                properties: Some(serde_json::json!({
                    "patch": {
                        "type": "string",
                        "description": "Patch content in unified diff format"
                    },
                    "workdir": {
                        "type": "string",
                        "description": "Working directory for patch application (optional)"
                    }
                })),
                required: Some(vec!["patch".to_string()]),
            },
            output_schema: None,
        }
    }

    async fn call(&self, arguments: Value) -> Result<CallToolResult> {
        let patch_content = arguments
            .get("patch")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("missing 'patch' field"))?;

        let _workdir = arguments.get("workdir").and_then(|v| v.as_str());

        // Simple patch validation for now
        // TODO: Use the actual codex_apply_patch crate when build issues are resolved
        if patch_content.contains("@@")
            && (patch_content.contains("+++") || patch_content.contains("---"))
        {
            Ok(CallToolResult {
                content: vec![ContentBlock::TextContent(TextContent { text: "Patch format validated successfully (actual application not implemented yet)".to_string(), r#type: "text".to_string(), annotations: None })],
                is_error: None,
                structured_content: None,
            })
        } else {
            Ok(CallToolResult {
                content: vec![ContentBlock::TextContent(TextContent {
                    text: "Invalid patch format - expected unified diff format".to_string(),
                    r#type: "text".to_string(),
                    annotations: None,
                })],
                is_error: Some(true),
                structured_content: None,
            })
        }
    }
}

/// Code analysis tool
#[derive(Debug)]
pub struct CodeAnalysisTool;

impl McpTool for CodeAnalysisTool {
    fn name(&self) -> &str {
        "code_analysis"
    }

    fn definition(&self) -> Tool {
        Tool {
            name: "code_analysis".to_string(),
            title: Some("Code Analysis".to_string()),
            description: Some(
                "Analyze code files for metrics, dependencies, and structure".to_string(),
            ),
            annotations: None,
            input_schema: ToolInputSchema {
                r#type: "object".to_string(),
                properties: Some(serde_json::json!({
                    "file_path": {
                        "type": "string",
                        "description": "Path to the code file to analyze"
                    },
                    "analysis_type": {
                        "type": "string",
                        "enum": ["metrics", "dependencies", "structure"],
                        "description": "Type of analysis to perform"
                    }
                })),
                required: Some(vec!["file_path".to_string(), "analysis_type".to_string()]),
            },
            output_schema: None,
        }
    }

    async fn call(&self, arguments: Value) -> Result<CallToolResult> {
        let file_path = arguments
            .get("file_path")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("missing 'file_path' field"))?;

        let analysis_type = arguments
            .get("analysis_type")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("missing 'analysis_type' field"))?;

        let path = Path::new(file_path);

        if !path.exists() {
            return Ok(CallToolResult {
                content: vec![ContentBlock::TextContent(TextContent {
                    text: format!("File not found: {}", file_path),
                    r#type: "text".to_string(),
                    annotations: None,
                })],
                is_error: Some(true),
                structured_content: None,
            });
        }

        match tokio::fs::read_to_string(path).await {
            Ok(content) => {
                let analysis_result = match analysis_type {
                    "metrics" => self.analyze_metrics(&content),
                    "dependencies" => self.analyze_dependencies(&content, path),
                    "structure" => self.analyze_structure(&content),
                    _ => format!("Unknown analysis type: {}", analysis_type),
                };

                Ok(CallToolResult {
                    content: vec![ContentBlock::TextContent(TextContent {
                        text: analysis_result,
                        r#type: "text".to_string(),
                        annotations: None,
                    })],
                    is_error: None,
                    structured_content: None,
                })
            }
            Err(e) => Ok(CallToolResult {
                content: vec![ContentBlock::TextContent(TextContent {
                    text: format!("Error reading file: {}", e),
                    r#type: "text".to_string(),
                    annotations: None,
                })],
                is_error: Some(true),
                structured_content: None,
            }),
        }
    }
}

impl CodeAnalysisTool {
    fn analyze_metrics(&self, content: &str) -> String {
        let lines = content.lines().count();
        let non_empty_lines = content
            .lines()
            .filter(|line| !line.trim().is_empty())
            .count();
        let comment_lines = content
            .lines()
            .filter(|line| {
                let trimmed = line.trim();
                trimmed.starts_with("//") || trimmed.starts_with('#') || trimmed.starts_with("/*")
            })
            .count();

        format!(
            "Code Metrics:\n\
             - Total lines: {}\n\
             - Non-empty lines: {}\n\
             - Comment lines: {}\n\
             - Code lines: {}",
            lines,
            non_empty_lines,
            comment_lines,
            non_empty_lines - comment_lines
        )
    }

    fn analyze_dependencies(&self, content: &str, path: &Path) -> String {
        let mut dependencies = Vec::new();

        // Basic dependency detection for common languages
        if path.extension().map_or(false, |ext| ext == "rs") {
            // Rust dependencies
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("use ") {
                    dependencies.push(trimmed.to_string());
                }
            }
        } else if path.extension().map_or(false, |ext| ext == "py") {
            // Python dependencies
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("import ") || trimmed.starts_with("from ") {
                    dependencies.push(trimmed.to_string());
                }
            }
        } else if path
            .extension()
            .map_or(false, |ext| ext == "js" || ext == "ts")
        {
            // JavaScript/TypeScript dependencies
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("import ")
                    || trimmed.starts_with("const ") && trimmed.contains("require(")
                {
                    dependencies.push(trimmed.to_string());
                }
            }
        }

        if dependencies.is_empty() {
            "No dependencies found or unsupported file type".to_string()
        } else {
            format!("Dependencies:\n{}", dependencies.join("\n"))
        }
    }

    fn analyze_structure(&self, content: &str) -> String {
        let mut functions = Vec::new();
        let mut structs = Vec::new();
        let mut classes = Vec::new();

        for line in content.lines() {
            let trimmed = line.trim();

            // Rust patterns
            if trimmed.starts_with("fn ") {
                if let Some(name) = trimmed.split_whitespace().nth(1) {
                    functions.push(format!("fn {}", name.split('(').next().unwrap_or(name)));
                }
            } else if trimmed.starts_with("struct ") {
                if let Some(name) = trimmed.split_whitespace().nth(1) {
                    structs.push(format!(
                        "struct {}",
                        name.split_whitespace().next().unwrap_or(name)
                    ));
                }
            }
            // Python patterns
            else if trimmed.starts_with("def ") {
                if let Some(name) = trimmed.split_whitespace().nth(1) {
                    functions.push(format!("def {}", name.split('(').next().unwrap_or(name)));
                }
            } else if trimmed.starts_with("class ") {
                if let Some(name) = trimmed.split_whitespace().nth(1) {
                    classes.push(format!("class {}", name.split('(').next().unwrap_or(name)));
                }
            }
            // JavaScript/TypeScript patterns
            else if trimmed.starts_with("function ") {
                if let Some(name) = trimmed.split_whitespace().nth(1) {
                    functions.push(format!(
                        "function {}",
                        name.split('(').next().unwrap_or(name)
                    ));
                }
            } else if trimmed.starts_with("class ") {
                if let Some(name) = trimmed.split_whitespace().nth(1) {
                    classes.push(format!("class {}", name.split(' ').next().unwrap_or(name)));
                }
            }
        }

        let mut result = String::new();

        if !functions.is_empty() {
            result.push_str(&format!(
                "Functions ({}):\n{}\n",
                functions.len(),
                functions.join("\n")
            ));
        }
        if !structs.is_empty() {
            result.push_str(&format!(
                "Structs ({}):\n{}\n",
                structs.len(),
                structs.join("\n")
            ));
        }
        if !classes.is_empty() {
            result.push_str(&format!(
                "Classes ({}):\n{}\n",
                classes.len(),
                classes.join("\n")
            ));
        }

        if result.is_empty() {
            "No functions, structs, or classes found".to_string()
        } else {
            result
        }
    }
}
