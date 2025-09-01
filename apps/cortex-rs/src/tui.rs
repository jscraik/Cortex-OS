use ratatui::{
    backend::CrosstermBackend, Terminal,
    widgets::{Block, Borders, Paragraph},
    layout::{Layout, Direction, Constraint},
    text::Text
};
use crossterm::{execute, terminal::{enable_raw_mode, disable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen}, event::{self, Event, KeyCode}};
use std::io::{stdout, Stdout};

use crate::app::App;

pub async fn run(app: &mut App) -> anyhow::Result<()> {
    enable_raw_mode()?;
    let mut out: Stdout = stdout();
    execute!(out, EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(out);
    let mut term = Terminal::new(backend)?;
    loop {
        term.draw(|f| {
            let chunks = Layout::default()
                .direction(Direction::Vertical)
                .constraints([Constraint::Min(3), Constraint::Length(3)].as_ref())
                .split(f.area());
            let history = Text::from(app.messages.join("\n"));
            f.render_widget(Paragraph::new(history).block(Block::default().title("history").borders(Borders::ALL)), chunks[0]);
            f.render_widget(Paragraph::new(app.input.as_str()).block(Block::default().title("compose").borders(Borders::ALL)), chunks[1]);
        })?;
        if event::poll(std::time::Duration::from_millis(33))? {
            if let Event::Key(key) = event::read()? {
                match key.code {
                    KeyCode::Char(c) => app.input.push(c),
                    KeyCode::Backspace => { app.input.pop(); },
                    KeyCode::Enter => app.submit(),
                    KeyCode::Esc => break,
                    _ => {}
                }
            }
        }
    }
    disable_raw_mode()?;
    execute!(term.backend_mut(), LeaveAlternateScreen)?;
    Ok(())
}
