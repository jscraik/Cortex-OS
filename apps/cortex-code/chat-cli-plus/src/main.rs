use clap::Parser;
use codex_arg0::arg0_dispatch_or_else;
use codex_common::CliConfigOverrides;
use serde::Serialize;
use std::fs::{self, File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio_stream::StreamExt;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CliStreamMode {
    Auto,
    Aggregate,
    Raw,
    Json,
}

#[derive(Debug, Clone, clap::ValueEnum)]
enum StreamModeArg {
    Auto,
    Aggregate,
    Raw,
    Json,
}

impl From<StreamModeArg> for CliStreamMode {
    fn from(arg: StreamModeArg) -> Self {
        match arg {
            StreamModeArg::Auto => CliStreamMode::Auto,
            StreamModeArg::Aggregate => CliStreamMode::Aggregate,
            StreamModeArg::Raw => CliStreamMode::Raw,
            StreamModeArg::Json => CliStreamMode::Json,
        }
    }
}

#[derive(Debug, Parser)]
#[clap(author, version, bin_name = "codex-chat")]
struct ChatCli {
    #[clap(flatten)]
    pub config_overrides: CliConfigOverrides,

    /// The prompt to send. Use "-" to read from stdin. Optional with --repl.
    #[arg(value_name = "PROMPT")]
    prompt: Option<String>,

    /// Named session persisted under `$CODEX_HOME/sessions/<name>.jsonl`.
    #[arg(long = "session", value_name = "NAME", conflicts_with = "session_file")]
    session_name: Option<String>,

    /// Explicit path to a session history file (JSONL of ResponseItem).
    #[arg(long = "session-file", value_name = "PATH")]
    session_file: Option<PathBuf>,

    /// Start a fresh session, ignoring any existing history file.
    #[arg(long = "reset")]
    reset: bool,

    /// REPL mode: send each line as a new turn. PROMPT is optional.
    #[arg(long = "repl")]
    repl: bool,

    /// Unified streaming mode control.
    #[arg(long = "stream-mode", value_enum, conflicts_with_all = ["aggregate", "no_aggregate", "stream_json", "json"])]
    stream_mode: Option<StreamModeArg>,

    /// Deprecated flags (kept for convenience/parity)
    #[arg(long = "aggregate", conflicts_with = "no_aggregate")]
    aggregate: bool,
    #[arg(long = "no-aggregate", visible_alias = "raw", conflicts_with = "aggregate")]
    no_aggregate: bool,
    #[arg(long = "stream-json", conflicts_with_all = ["aggregate", "no_aggregate"])]
    stream_json: bool,
    #[arg(long = "json", conflicts_with_all = ["aggregate", "no_aggregate", "stream_json"])]
    json: bool,
}

fn main() -> anyhow::Result<()> {
    arg0_dispatch_or_else(|_codex_linux_sandbox_exe| async move {
        run().await?;
        Ok(())
    })
}

async fn run() -> anyhow::Result<()> {
    let mut cli = ChatCli::parse();
    // Session name implies REPL-friendly usage.
    if cli.session_name.is_some() {
        cli.repl = true;
    }

    let stream_mode = resolve_stream_mode(&cli);

    // Load Config with typed overrides (generic -c flags supported via CliConfigOverrides)
    let cfg = codex_core::config::Config::load_with_cli_overrides(
        cli.config_overrides
            .parse_overrides()
            .map_err(anyhow::Error::msg)?,
        codex_core::config::ConfigOverrides::default(),
    )?;

    // Resolve session path and prior history
    let session_path = resolve_session_path(&cfg.codex_home, &cli.session_name, cli.session_file);
    let history: Vec<codex_core::ResponseItem> = if let Some(path) = session_path.as_deref() {
        if cli.reset {
            ensure_parent_dir(path)?;
            truncate_file(path)?;
            Vec::new()
        } else {
            read_history_jsonl(path)
        }
    } else {
        Vec::new()
    };

    let auth_manager = Arc::new(codex_core::AuthManager::new(
        cfg.codex_home.clone(),
        cfg.preferred_auth_method,
    ));
    let provider = cfg.model_provider.clone();
    let effort = cfg.model_reasoning_effort;
    let summary = cfg.model_reasoning_summary;
    let client = codex_core::ModelClient::new(
        Arc::new(cfg.clone()),
        Some(auth_manager),
        provider,
        effort,
        summary,
        Uuid::new_v4(),
    );

    // Helper to create a prompt turn with optional prior history
    let run_turn = |text: String, prior: &Vec<codex_core::ResponseItem>| -> anyhow::Result<(
        codex_core::ResponseItem,
        Vec<codex_core::ResponseItem>,
    )> {
        let user_item = codex_core::ResponseItem::Message {
            id: None,
            role: "user".to_string(),
            content: vec![codex_core::ContentItem::InputText { text }],
        };
        let mut prompt = codex_core::Prompt::default();
        if !prior.is_empty() {
            prompt.input.extend(prior.clone());
        }
        prompt.input.push(user_item.clone());
        Ok((user_item, prompt.input))
    };

    // Stream a single prompt and print deltas/items depending on mode.
    async fn stream_turn(
        client: &codex_core::ModelClient,
        prompt_input: Vec<codex_core::ResponseItem>,
        stream_mode: CliStreamMode,
    ) -> anyhow::Result<Vec<codex_core::ResponseItem>> {
        let mut prompt = codex_core::Prompt::default();
        prompt.input = prompt_input;
        let mut stream = match stream_mode {
            CliStreamMode::Raw => client.stream_raw(&prompt).await?,
            CliStreamMode::Json => client.stream_raw(&prompt).await?,
            CliStreamMode::Aggregate | CliStreamMode::Auto => client.stream(&prompt).await?,
        };

        let mut completed_items: Vec<codex_core::ResponseItem> = Vec::new();
        let mut printed_any_delta = false;

        fn process_event(
            ev: codex_core::ResponseEvent,
            printed_any_delta: &mut bool,
            completed_items: &mut Vec<codex_core::ResponseItem>,
            as_json: bool,
        ) {
            if as_json {
                #[derive(Serialize)]
                struct JsonEvent<'a> {
                    r#type: &'static str,
                    #[serde(skip_serializing_if = "Option::is_none")] delta: Option<&'a str>,
                    #[serde(skip_serializing_if = "Option::is_none")] item: Option<&'a codex_core::ResponseItem>,
                }
                match &ev {
                    codex_core::ResponseEvent::OutputTextDelta(s) => {
                        if let Ok(line) = serde_json::to_string(&JsonEvent { r#type: "delta", delta: Some(s), item: None }) {
                            println!("{line}");
                        }
                    }
                    codex_core::ResponseEvent::OutputItemDone(item) => {
                        if let Ok(line) = serde_json::to_string(&JsonEvent { r#type: "item", delta: None, item: Some(item) }) {
                            println!("{line}");
                        }
                    }
                    codex_core::ResponseEvent::Completed { .. } => {
                        if let Ok(line) = serde_json::to_string(&JsonEvent { r#type: "completed", delta: None, item: None }) {
                            println!("{line}");
                        }
                    }
                    _ => {}
                }
            }
            match ev {
                codex_core::ResponseEvent::OutputTextDelta(s) => {
                    if !as_json {
                        print!("{s}");
                        use std::io::Write as _;
                        std::io::stdout().flush().ok();
                    }
                    *printed_any_delta = true;
                }
                codex_core::ResponseEvent::OutputItemDone(item) => {
                    if !*printed_any_delta {
                        if !as_json {
                            if let codex_core::ResponseItem::Message { role, content, .. } = &item {
                                if role == "assistant" {
                                    if let Some(text) = content.iter().find_map(|c| match c {
                                        codex_core::ContentItem::OutputText { text } => Some(text),
                                        _ => None,
                                    }) {
                                        print!("{text}");
                                        use std::io::Write as _;
                                        std::io::stdout().flush().ok();
                                    }
                                }
                            }
                        }
                    }
                    completed_items.push(item);
                }
                codex_core::ResponseEvent::Completed { .. } => {
                    if !as_json {
                        println!();
                    }
                }
                _ => {}
            }
        }

        while let Some(event) = stream.next().await {
            process_event(event?, &mut printed_any_delta, &mut completed_items, matches!(stream_mode, CliStreamMode::Json));
        }
        Ok(completed_items)
    }

    let mut session_history = history.clone();

    if cli.repl {
        if let Some(p) = cli.prompt.clone() {
            let first_text = if p == "-" { read_stdin_all()? } else { p };
            let (user_item, prompt_input) = run_turn(first_text, &session_history)?;
            let assistant_items = stream_turn(&client, prompt_input, stream_mode).await?;
            if let Some(path) = session_path.as_deref() {
                ensure_parent_dir(path)?;
                append_history_jsonl(path, &user_item)?;
                for item in &assistant_items {
                    append_history_jsonl(path, item)?;
                }
            }
            session_history.push(user_item);
            session_history.extend(assistant_items);
        }

        let stdin = std::io::stdin();
        let mut buf = String::new();
        loop {
            buf.clear();
            print!("You> ");
            use std::io::Write as _;
            std::io::stdout().flush().ok();
            if stdin.read_line(&mut buf).is_err() {
                break;
            }
            let line = buf.trim_end().to_string();
            if line.is_empty() || line == ":q" || line == ":quit" {
                break;
            }
            let (user_item, prompt_input) = run_turn(line, &session_history)?;
            let assistant_items = stream_turn(&client, prompt_input, stream_mode).await?;
            if let Some(path) = session_path.as_deref() {
                ensure_parent_dir(path)?;
                append_history_jsonl(path, &user_item)?;
                for item in &assistant_items {
                    append_history_jsonl(path, item)?;
                }
            }
            session_history.push(user_item);
            session_history.extend(assistant_items);
        }
    } else {
        let p = cli
            .prompt
            .clone()
            .ok_or_else(|| anyhow::anyhow!("PROMPT is required unless --repl is used"))?;
        let text = if p == "-" { read_stdin_all()? } else { p };
        let (user_item, prompt_input) = run_turn(text, &session_history)?;
        let assistant_items = stream_turn(&client, prompt_input, stream_mode).await?;
        if let Some(path) = session_path.as_deref() {
            ensure_parent_dir(path)?;
            append_history_jsonl(path, &user_item)?;
            for item in assistant_items {
                append_history_jsonl(path, &item)?;
            }
        }
    }

    Ok(())
}

fn compute_stream_mode_from_cli(cli: &ChatCli) -> Option<CliStreamMode> {
    if let Some(mode) = &cli.stream_mode {
        return Some((*mode).clone().into());
    }
    if cli.stream_json || cli.json {
        eprintln!("(deprecated) --json/--stream-json: use --stream-mode json");
        return Some(CliStreamMode::Json);
    }
    if cli.aggregate {
        eprintln!("(deprecated) --aggregate: use --stream-mode aggregate");
        return Some(CliStreamMode::Aggregate);
    }
    if cli.no_aggregate {
        eprintln!("(deprecated) --no-aggregate: use --stream-mode raw");
        return Some(CliStreamMode::Raw);
    }
    None
}

fn resolve_stream_mode(cli: &ChatCli) -> CliStreamMode {
    if let Some(m) = compute_stream_mode_from_cli(cli) {
        return m;
    }
    if let Ok(raw) = std::env::var("CODEX_STREAM_MODE") {
        match raw.to_ascii_lowercase().as_str() {
            "aggregate" => return CliStreamMode::Aggregate,
            "raw" | "no-aggregate" => return CliStreamMode::Raw,
            "json" => return CliStreamMode::Json,
            _ => {}
        }
    }
    CliStreamMode::Auto
}

fn resolve_session_path(
    codex_home: &Path,
    session_name: &Option<String>,
    session_file: Option<PathBuf>,
) -> Option<PathBuf> {
    if let Some(file) = session_file {
        return Some(file);
    }
    if let Some(name) = session_name {
        let mut p = codex_home.to_path_buf();
        p.push("sessions");
        p.push(format!("{name}.jsonl"));
        return Some(p);
    }
    None
}

fn ensure_parent_dir(path: &Path) -> anyhow::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    Ok(())
}

fn truncate_file(path: &Path) -> anyhow::Result<()> {
    File::create(path)?; // create truncates
    Ok(())
}

fn read_history_jsonl(path: &Path) -> Vec<codex_core::ResponseItem> {
    let f = match File::open(path) {
        Ok(f) => f,
        Err(_) => return Vec::new(),
    };
    let reader = BufReader::new(f);
    let mut items = Vec::new();
    for line in reader.lines().map_while(Result::ok) {
        if line.trim().is_empty() {
            continue;
        }
        if let Ok(item) = serde_json::from_str::<codex_core::ResponseItem>(&line) {
            items.push(item);
        }
    }
    items
}

fn append_history_jsonl(path: &Path, item: &codex_core::ResponseItem) -> anyhow::Result<()> {
    let mut file = OpenOptions::new().create(true).append(true).open(path)?;
    let line = serde_json::to_string(item)?;
    writeln!(file, "{line}")?;
    Ok(())
}

fn read_stdin_all() -> anyhow::Result<String> {
    use std::io::Read;
    let mut buf = String::new();
    std::io::stdin().read_to_string(&mut buf)?;
    Ok(buf)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cli_flags_map_to_stream_mode() {
        let cli = ChatCli::parse_from(["codex-chat", "--stream-mode", "raw", "hello"]);
        assert!(matches!(compute_stream_mode_from_cli(&cli), Some(CliStreamMode::Raw)));
    }
}
