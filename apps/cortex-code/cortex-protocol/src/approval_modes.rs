use serde::{Deserialize, Serialize};

/// Set approval mode for AI actions
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(feature = "clap", derive(clap::ValueEnum))]
pub enum ApprovalMode {
    /// Apply edits automatically, require approval for shell commands (default)
    #[cfg_attr(feature = "clap", clap(name = "auto-edit"))]
    AutoEdit,
    /// Suggest edits, await user approval
    #[cfg_attr(feature = "clap", clap(name = "suggest"))]
    Suggest,
    /// Completely autonomous (sandboxed, network-disabled)
    #[cfg_attr(feature = "clap", clap(name = "full-auto"))]
    FullAuto,
    /// Plan mode - generate a plan but don't execute
    #[cfg_attr(feature = "clap", clap(name = "plan"))]
    Plan,
}

impl Default for ApprovalMode {
    fn default() -> Self {
        ApprovalMode::Suggest
    }
}

impl ApprovalMode {
    /// Check if this mode allows automatic execution
    pub fn allows_auto_execution(&self) -> bool {
        matches!(self, ApprovalMode::AutoEdit | ApprovalMode::FullAuto)
    }

    /// Check if this mode requires user approval for edits
    pub fn requires_edit_approval(&self) -> bool {
        matches!(self, ApprovalMode::Suggest)
    }

    /// Check if this mode requires user approval for shell commands
    pub fn requires_shell_approval(&self) -> bool {
        matches!(self, ApprovalMode::AutoEdit | ApprovalMode::Suggest)
    }

    /// Check if this mode is planning only (no execution)
    pub fn is_planning_only(&self) -> bool {
        matches!(self, ApprovalMode::Plan)
    }

    /// Get human-readable description of the mode
    pub fn description(&self) -> &'static str {
        match self {
            ApprovalMode::AutoEdit => "Apply edits automatically, require approval for shell commands",
            ApprovalMode::Suggest => "Suggest edits, await user approval (safest)",
            ApprovalMode::FullAuto => "Completely autonomous (sandboxed, network-disabled)",
            ApprovalMode::Plan => "Generate plan but don't execute (analysis only)",
        }
    }
}

/// Optional image data for multimodal input
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageData {
    pub data: Vec<u8>,
    pub mime_type: String,
    pub description: Option<String>,
}

impl ImageData {
    pub fn new(data: Vec<u8>, mime_type: String) -> Self {
        Self {
            data,
            mime_type,
            description: None,
        }
    }

    pub fn with_description(mut self, description: String) -> Self {
        self.description = Some(description);
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_approval_mode_defaults() {
        assert_eq!(ApprovalMode::default(), ApprovalMode::Suggest);
    }

    #[test]
    fn test_approval_mode_behavior() {
        assert!(ApprovalMode::AutoEdit.allows_auto_execution());
        assert!(ApprovalMode::FullAuto.allows_auto_execution());
        assert!(!ApprovalMode::Suggest.allows_auto_execution());
        assert!(!ApprovalMode::Plan.allows_auto_execution());

        assert!(ApprovalMode::Suggest.requires_edit_approval());
        assert!(!ApprovalMode::AutoEdit.requires_edit_approval());

        assert!(ApprovalMode::AutoEdit.requires_shell_approval());
        assert!(ApprovalMode::Suggest.requires_shell_approval());
        assert!(!ApprovalMode::FullAuto.requires_shell_approval());

        assert!(ApprovalMode::Plan.is_planning_only());
        assert!(!ApprovalMode::AutoEdit.is_planning_only());
    }
}
