#[cfg(test)]
mod overlay_smoke {
    use crate::streaming::controller::{AppEventHistorySink, StreamController};
    use crate::app_event_sender::AppEventSender;
    use codex_core::config::{Config, ConfigOverrides};

    #[test]
    fn overlay_basic_stream_flow_commits_lines() {
        let overrides = ConfigOverrides { cwd: std::env::current_dir().ok(), ..Default::default() };
        let cfg = Config::load_with_cli_overrides(vec![], overrides).expect("config");
        let mut ctrl = StreamController::new(cfg);
        let (tx, _rx) = tokio::sync::mpsc::unbounded_channel();
        let sink = AppEventHistorySink(AppEventSender::new(tx));

        ctrl.begin(&sink);
        ctrl.push_and_maybe_commit("Hello ", &sink);
        ctrl.push_and_maybe_commit("world\n", &sink);
        assert!(ctrl.finalize(true, &sink));
    }
}

