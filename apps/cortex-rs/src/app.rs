use serde::{Deserialize, Serialize};

#[derive(Default, Serialize, Deserialize)]
pub struct App {
    pub input: String,
    pub messages: Vec<String>,
    pub status: String,
}

impl App {
    pub fn submit(&mut self) {
        if !self.input.is_empty() {
            self.messages.push(format!("you: {}", self.input));
            // TODO: dispatch to provider; append streamed reply
            self.input.clear();
        }
    }
}
