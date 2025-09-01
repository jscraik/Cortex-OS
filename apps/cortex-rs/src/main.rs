mod tui;
mod app;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let mut app = app::App::default();
    tui::run(&mut app).await?;
    Ok(())
}
