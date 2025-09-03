# SDK Overview

This document provides an overview of the planned Software Development Kits (SDKs) for Cortex Code. These SDKs will enable developers to integrate Cortex Code functionality into their applications, scripts, and workflows.

_Note: These SDKs are planned for implementation and are not yet available in the current release._

## Overview

The Cortex Code SDKs will provide language-specific interfaces to the Cortex Code REST API, enabling developers to:

- Integrate AI chat functionality into applications
- Monitor GitHub activity programmatically
- Visualize A2A communications
- Manage MCP servers and plugins
- Access all Cortex Code features programmatically

## Supported Languages

### Python SDK (Planned)

The Python SDK will be the first SDK released, targeting data scientists, ML engineers, and Python developers.

#### Installation

```bash
pip install cortex-code-sdk
```

#### Basic Usage

```python
from cortex_code import CortexClient

# Initialize client
client = CortexClient(api_key="your-api-key")

# Chat with AI
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "Hello, how can you help me today?"}
    ]
)

print(response.choices[0].message.content)
```

#### Streaming Responses

```python
from cortex_code import CortexClient

client = CortexClient(api_key="your-api-key")

# Stream response
stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "Write a poem about coding."}
    ],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

#### GitHub Integration

```python
from cortex_code import CortexClient

client = CortexClient(api_key="your-api-key")

# Get repository information
repo = client.github.get_repo("cortex-os", "cortex-os")
print(f"Stars: {repo.stargazers_count}")

# List pull requests
prs = client.github.list_pull_requests("cortex-os", "cortex-os", state="open")
for pr in prs:
    print(f"PR #{pr.number}: {pr.title}")
```

#### A2A Event Monitoring

```python
from cortex_code import CortexClient

client = CortexClient(api_key="your-api-key")

# List agents
agents = client.a2a.list_agents()
for agent in agents:
    print(f"Agent: {agent.name} (Status: {agent.status})")

# Monitor events
def on_event(event):
    print(f"Event: {event.type} from {event.source}")

client.a2a.stream_events(on_event)
```

### TypeScript SDK (Planned)

The TypeScript SDK will target web developers and Node.js applications.

#### Installation

```bash
npm install @cortex-code/sdk
```

#### Basic Usage

```typescript
import { CortexClient } from '@cortex-code/sdk';

// Initialize client
const client = new CortexClient({ apiKey: 'your-api-key' });

// Chat with AI
const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello, how can you help me today?' }],
});

console.log(response.choices[0].message.content);
```

#### Streaming Responses

```typescript
import { CortexClient } from '@cortex-code/sdk';

const client = new CortexClient({ apiKey: 'your-api-key' });

// Stream response
const stream = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Write a poem about coding.' }],
  stream: true,
});

for await (const chunk of stream) {
  if (chunk.choices[0].delta.content) {
    process.stdout.write(chunk.choices[0].delta.content);
  }
}
```

#### React Integration

```tsx
import React, { useState, useEffect } from 'react';
import { CortexClient } from '@cortex-code/sdk';

const CortexChat: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');

  const client = new CortexClient({ apiKey: 'your-api-key' });

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);

    // Get AI response
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [...messages, userMessage],
    });

    // Add AI message
    setMessages((prev) => [...prev, response.choices[0].message]);
    setInput('');
  };

  return (
    <div>
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};
```

### Other Planned SDKs

#### Go SDK (Planned)

```go
package main

import (
    "fmt"
    "github.com/cortex-code/sdk-go/cortex"
)

func main() {
    client := cortex.NewClient("your-api-key")

    response, err := client.Chat.Completions.Create(&cortex.ChatCompletionRequest{
        Model: "gpt-4o",
        Messages: []cortex.Message{
            {Role: "user", Content: "Hello, how can you help me today?"},
        },
    })

    if err != nil {
        panic(err)
    }

    fmt.Println(response.Choices[0].Message.Content)
}
```

#### Java SDK (Planned)

```java
import ai.cortex.code.CortexClient;
import ai.cortex.code.models.ChatCompletionRequest;

public class CortexExample {
    public static void main(String[] args) {
        CortexClient client = new CortexClient("your-api-key");

        ChatCompletionRequest request = ChatCompletionRequest.builder()
            .model("gpt-4o")
            .addMessage("user", "Hello, how can you help me today?")
            .build();

        ChatCompletionResponse response = client.chat().completions().create(request);

        System.out.println(response.getChoices().get(0).getMessage().getContent());
    }
}
```

#### Rust SDK (Planned)

```rust
use cortex_code_sdk::{CortexClient, ChatCompletionRequest};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = CortexClient::new("your-api-key");

    let request = ChatCompletionRequest::new("gpt-4o")
        .add_message("user", "Hello, how can you help me today?");

    let response = client.chat().completions().create(request).await?;

    println!("{}", response.choices[0].message.content);

    Ok(())
}
```

## Common SDK Features

All SDKs will provide consistent functionality:

### Authentication

- API key authentication
- OAuth2 support (Enterprise)
- Automatic token refresh

### Error Handling

- Type-safe error responses
- Automatic retry logic
- Request timeout handling

### Configuration

- Custom base URLs
- Timeout configuration
- Retry configuration
- Proxy support

### Asynchronous Support

- Promise/async-await patterns
- Callback-based interfaces
- Stream handling

### Type Safety

- Strongly typed request/response objects
- IDE autocomplete support
- Compile-time validation

## Advanced Features

### Batch Processing

```python
from cortex_code import CortexClient

client = CortexClient(api_key="your-api-key")

# Batch process multiple requests
requests = [
    {"model": "gpt-4o", "messages": [{"role": "user", "content": "Task 1"}]},
    {"model": "gpt-4o", "messages": [{"role": "user", "content": "Task 2"}]},
    {"model": "gpt-4o", "messages": [{"role": "user", "content": "Task 3"}]},
]

responses = client.chat.completions.batch_create(requests)
for response in responses:
    print(response.choices[0].message.content)
```

### Caching

```python
from cortex_code import CortexClient

client = CortexClient(
    api_key="your-api-key",
    cache_enabled=True,
    cache_ttl=300  # 5 minutes
)

# First call hits the API
response1 = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What is 2+2?"}]
)

# Second call returns cached result
response2 = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What is 2+2?"}]
)
```

### Rate Limiting

```python
from cortex_code import CortexClient

client = CortexClient(
    api_key="your-api-key",
    rate_limit_retry=True,
    max_retries=3
)

# Automatically retries on rate limit exceeded
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Complex request"}]
)
```

## Integration Examples

### Jupyter Notebook Integration

```python
# In a Jupyter notebook
from cortex_code import CortexClient
import pandas as pd

client = CortexClient(api_key="your-api-key")

# Analyze data with AI
df = pd.read_csv('data.csv')
prompt = f"Analyze this dataset: {df.head().to_string()}"

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": prompt}]
)

print(response.choices[0].message.content)
```

### CI/CD Pipeline Integration

```python
# In a CI/CD script
from cortex_code import CortexClient

client = CortexClient(api_key="your-api-key")

def run_code_review(diff):
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a code reviewer. Provide constructive feedback."},
            {"role": "user", "content": f"Review this code diff:\n{diff}"}
        ]
    )

    return response.choices[0].message.content

# Integrate with your CI system
diff = get_git_diff()
review = run_code_review(diff)
post_review_comment(review)
```

## SDK Generation

The SDKs will be automatically generated from the OpenAPI specification of the Cortex Code REST API, ensuring:

- Consistent interfaces across languages
- Automatic updates when the API changes
- Type safety and validation
- Comprehensive documentation

## Related Documentation

- [API Reference](api-reference.md) - Detailed REST API documentation
- [Roadmap](roadmap.md) - Planned features and enhancements
