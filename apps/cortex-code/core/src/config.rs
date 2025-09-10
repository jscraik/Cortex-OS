// Temporary shim: expose the previous config module implementation.
// This file includes the contents of `config.rs.bak` to restore the
// `crate::config` module expected by the rest of the workspace.
// TODO: fold these definitions back into a single `config.rs` once the
// TDD refactor is complete.
include!("config.rs.bak");

