use anyhow::{Context, Result, bail};
use clap::{Parser, Subcommand};
use std::path::PathBuf;
use std::process::Command;

#[derive(Parser, Debug)]
#[command(name = "xtask", version, about = "Codex developer automation tasks")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Run coverage using cargo-llvm-cov (lcov + html)
    Coverage {
        /// Pass through additional test args after `--`
        #[arg(last = true)]
        args: Vec<String>,
    },
    /// Generate coverage report only (expects prior instrumentation via cargo-llvm-cov run)
    CoverageReport {},
    /// Verify necessary tools are installed
    Doctor {},
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Commands::Coverage { args } => coverage(args),
        Commands::CoverageReport {} => coverage_report(),
        Commands::Doctor {} => doctor(),
    }
}

fn workspace_root() -> Result<PathBuf> {
    // Assume we are in apps/cortex-codex/xtask or deeper
    let path = std::env::current_dir()?;
    for ancestor in path.ancestors() {
        if ancestor.join("Cargo.toml").exists() && ancestor.join("core").exists() {
            return Ok(ancestor.to_path_buf());
        }
    }
    bail!("Could not locate codex workspace root from {:?}", path)
}

fn have(cmd: &str) -> bool {
    which::which(cmd).is_ok()
}

fn run(cmd: &mut Command) -> Result<()> {
    let status = cmd
        .status()
        .with_context(|| format!("failed to spawn {:?}", cmd))?;
    if !status.success() {
        bail!("command {:?} failed with {}", cmd, status);
    }
    Ok(())
}

fn coverage(args: Vec<String>) -> Result<()> {
    if !have("cargo-llvm-cov") {
        bail!("cargo-llvm-cov not installed. Install with: cargo install cargo-llvm-cov");
    }
    let mut cmd = Command::new("cargo");
    cmd.arg("llvm-cov")
        .arg("--workspace")
        .arg("--lcov")
        .arg("--output-path")
        .arg("target/coverage/lcov.info")
        .arg("--html");
    if !args.is_empty() {
        cmd.arg("--").args(args);
    }
    run(&mut cmd)?;
    Ok(())
}

fn coverage_report() -> Result<()> {
    if !have("cargo-llvm-cov") {
        bail!("cargo-llvm-cov not installed");
    }
    let mut cmd = Command::new("cargo");
    cmd.arg("llvm-cov")
        .arg("--no-run")
        .arg("--workspace")
        .arg("--lcov")
        .arg("--output-path")
        .arg("target/coverage/lcov.info")
        .arg("--html");
    run(&mut cmd)?;
    Ok(())
}

fn doctor() -> Result<()> {
    println!("Tool availability:");
    for tool in [
        "cargo-llvm-cov",
        "llvm-profdata",
        "llvm-cov",
        "cargo",
        "rustc",
    ] {
        println!(
            "  {:<14} {}",
            tool,
            if have(tool) { "OK" } else { "MISSING" }
        );
    }
    Ok(())
}
