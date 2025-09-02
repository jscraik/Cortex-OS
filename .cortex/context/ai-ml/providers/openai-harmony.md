========================
CODE SNIPPETS
========================

TITLE: Example User Query
DESCRIPTION: An example of a user asking a question to the system.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_simple_convo_medium_effort_no_instruction.txt#_snippet_1>

LANGUAGE: user
CODE:

```
What is the capital of the largest country in the world?
```

----------------------------------------

TITLE: User Query Example
DESCRIPTION: An example of a user's question directed to the system.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_simple_convo_medium_effort.txt#_snippet_2>

LANGUAGE: user
CODE:

```
What is the capital of the largest country in the world?
```

----------------------------------------

TITLE: User Query Example
DESCRIPTION: An example of a user asking a question to the system.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_reasoning_system_message_with_dates.txt#_snippet_1>

LANGUAGE: user
CODE:

```
What is 42 * pi?
```

----------------------------------------

TITLE: User Query Example
DESCRIPTION: An example of a user's question directed to the assistant.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_simple_convo_low_effort.txt#_snippet_2>

LANGUAGE: user
CODE:

```
What is the capital of the largest country in the world?
```

----------------------------------------

TITLE: User Query Example
DESCRIPTION: An example of a user's question.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_simple_convo_high_effort.txt#_snippet_2>

LANGUAGE: user
CODE:

```
What is the capital of the largest country in the world?
```

----------------------------------------

TITLE: User Query Example
DESCRIPTION: An example of a user's question posed to the system.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_simple_convo_low_effort_no_instruction.txt#_snippet_1>

LANGUAGE: user
CODE:

```
What is the capital of the largest country in the world?
```

----------------------------------------

TITLE: Installation
DESCRIPTION: Installs the openai-harmony package from PyPI using pip.

SOURCE: <https://github.com/openai/harmony/blob/main/docs/python.md#_snippet_0>

LANGUAGE: bash
CODE:

```
pip install openai-harmony
```

----------------------------------------

TITLE: User Query Example
DESCRIPTION: An example of a user's question directed to the system.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_reasoning_system_message_no_instruction.txt#_snippet_1>

LANGUAGE: user
CODE:

```
What is the best place to eat candy in the world?
```

----------------------------------------

TITLE: Run Development Server
DESCRIPTION: Commands to start the Next.js development server using different package managers. This allows for local development and testing.

SOURCE: <https://github.com/openai/harmony/blob/main/demo/harmony-demo/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

----------------------------------------

TITLE: User Query Example
DESCRIPTION: An example of a user's question posed to the system.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_simple_convo_high_effort_no_instruction.txt#_snippet_1>

LANGUAGE: user
CODE:

```
What is the capital of the largest country in the world?
```

----------------------------------------

TITLE: Build and Install Harmony Library
DESCRIPTION: Builds the Rust code and Python wrapper using maturin, then locally installs the library in the current virtual environment.

SOURCE: <https://github.com/openai/harmony/blob/main/AGENTS.md#_snippet_0>

LANGUAGE: bash
CODE:

```
maturin develop --release
```

----------------------------------------

TITLE: User Query Example
DESCRIPTION: An example of a user's input to the AI model.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_simple_convo.txt#_snippet_1>

LANGUAGE: user
CODE:

```
What is 2 + 2?
```

----------------------------------------

TITLE: Cloning and Bootstrapping OpenAI Harmony
DESCRIPTION: Steps to clone the OpenAI Harmony repository, set up a Python virtual environment, install necessary development dependencies, and compile the Rust crate along with the Python package.

SOURCE: <https://github.com/openai/harmony/blob/main/README.md#_snippet_7>

LANGUAGE: bash
CODE:

```
git clone https://github.com/openai/harmony.git
cd harmony
# Create & activate a virtualenv
python -m venv .venv
source .venv/bin/activate
# Install maturin and test dependencies
pip install maturin pytest mypy ruff  # tailor to your workflow
# Compile the Rust crate *and* install the Python package in editable mode
maturin develop --release
```

----------------------------------------

TITLE: Example Assistant Response
DESCRIPTION: An example of an assistant's response, indicating readiness to process input.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_simple_convo_medium_effort_no_instruction.txt#_snippet_2>

LANGUAGE: assistant
CODE:

```

```

----------------------------------------

TITLE: Assistant Response Example
DESCRIPTION: An example of an assistant's response to a user query.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_reasoning_system_message.txt#_snippet_2>

LANGUAGE: assistant
CODE:

```

```

----------------------------------------

TITLE: OpenAI Harmony Chat Conversation Format
DESCRIPTION: Illustrates the basic chat conversation format using the Harmony message structure. It shows an example input with a user message and the start of an assistant message, and a corresponding example output including channel information and the final answer.

SOURCE: <https://github.com/openai/harmony/blob/main/docs/format.md#_snippet_7>

LANGUAGE: APIDOC
CODE:

```
Chat Conversation Format:

Example Input:
<|start|>user<|message|>What is 2 + 2?<|end|>
<|start|>assistant

Example Output:
<|start|>assistant<|channel|>analysis<|message|>User asks: "What is 2 + 2?" Simple arithmetic. Provide answer.<|end|>
<|start|>assistant<|channel|>final<|message|>2 + 2 = 4.<|return|>
```

----------------------------------------

TITLE: Assistant Response Example
DESCRIPTION: An example of the AI model's response to a user query.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_simple_convo.txt#_snippet_2>

LANGUAGE: assistant
CODE:

```

```

----------------------------------------

TITLE: Assistant Response Example
DESCRIPTION: An example of an assistant's response, which is empty in this case.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_reasoning_system_message_with_dates.txt#_snippet_2>

LANGUAGE: assistant
CODE:

```

```

----------------------------------------

TITLE: Crate Setup and Import
DESCRIPTION: Demonstrates how to add the openai-harmony crate to your Cargo.toml and import necessary items for use in your Rust project.

SOURCE: <https://github.com/openai/harmony/blob/main/docs/rust.md#_snippet_0>

LANGUAGE: toml
CODE:

```
openai-harmony = { git = "https://github.com/openai/harmony" }
```

LANGUAGE: rust
CODE:

```
use openai_harmony::{load_harmony_encoding, HarmonyEncodingName};
use openai_harmony::chat::{Message, Role, Conversation};
```

----------------------------------------

TITLE: Install openai-harmony Python Package
DESCRIPTION: Installs the openai-harmony Python library using pip or uv.

SOURCE: <https://github.com/openai/harmony/blob/main/README.md#_snippet_1>

LANGUAGE: bash
CODE:

```
pip install openai-harmony
# or if you are using uv
uv pip install openai-harmony
```

----------------------------------------

TITLE: User Query Example
DESCRIPTION: An example of a user's question posed to the AI model.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_reasoning_system_message.txt#_snippet_1>

LANGUAGE: user
CODE:

```
What is 2 + 2?
```

----------------------------------------

TITLE: Python Example: Load Encoding and Render Conversation
DESCRIPTION: Demonstrates how to load a Harmony encoding, create a conversation with system and developer messages, render it for completion, and parse the response.

SOURCE: <https://github.com/openai/harmony/blob/main/README.md#_snippet_2>

LANGUAGE: python
CODE:

```
from openai_harmony import (
    load_harmony_encoding,
    HarmonyEncodingName,
    Role,
    Message,
    Conversation,
    DeveloperContent,
    SystemContent,
)
enc = load_harmony_encoding(HarmonyEncodingName.HARMONY_GPT_OSS)
convo = Conversation.from_messages([
    Message.from_role_and_content(
        Role.SYSTEM,
        SystemContent.new(),
    ),
    Message.from_role_and_content(
        Role.DEVELOPER,
        DeveloperContent.new().with_instructions("Talk like a pirate!")
    ),
    Message.from_role_and_content(Role.USER, "Arrr, how be you?"),
])
tokens = enc.render_conversation_for_completion(convo, Role.ASSISTANT)
print(tokens)
# Later, after the model responded …
parsed = enc.parse_messages_from_completion_tokens(tokens, role=Role.ASSISTANT)
print(parsed)
```

----------------------------------------

TITLE: Minimal Usage Example
DESCRIPTION: A minimal Rust program demonstrating how to build a conversation, render it using HarmonyEncoding, and parse tokens back into messages.

SOURCE: <https://github.com/openai/harmony/blob/main/docs/rust.md#_snippet_9>

LANGUAGE: rust
CODE:

```
use openai_harmony::chat::{Conversation, Message, Role, SystemContent};
use openai_harmony::{load_harmony_encoding, HarmonyEncodingName};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create some messages
    let convo = Conversation::from_messages([
        Message::from_role_and_content(Role::System, SystemContent::new()),
        Message::from_role_and_content(Role::User, "What is 2 + 2?"),
    ]);

    // Render tokens for completion
    let enc = load_harmony_encoding(HarmonyEncodingName::HarmonyGptOss)?;
    let tokens = enc.render_conversation_for_completion(&convo, Role::Assistant, None)?;
    println!("{:?}", tokens);

    // Decode & parse back
    println!("{}", enc.decode_utf8(&tokens)?);
    let parsed = enc.parse_messages_from_completion_tokens(tokens, Some(Role::Assistant))?;
    for m in parsed { println!("{:?}", m); }
    Ok(())
}
```

----------------------------------------

TITLE: Example Reasoning Output (CoT)
DESCRIPTION: Illustrates the output format for reasoning, showing 'analysis' channel for chain-of-thought (CoT) and 'final' channel for the response.

SOURCE: <https://github.com/openai/harmony/blob/main/docs/format.md#_snippet_12>

LANGUAGE: plaintext
CODE:

```
<|channel|>analysis<|message|>User asks: "What is 2 + 2?" Simple arithmetic. Provide answer.<|end|>
<|start|>assistant<|channel|>final<|message|>2 + 2 = 4.<|return|>
```

----------------------------------------

TITLE: Rust Example: Load Encoding and Render Conversation
DESCRIPTION: Demonstrates how to load a Harmony encoding and render a simple conversation for completion in Rust.

SOURCE: <https://github.com/openai/harmony/blob/main/README.md#_snippet_4>

LANGUAGE: rust
CODE:

```
use openai_harmony::chat::{Message, Role, Conversation};
use openai_harmony::{HarmonyEncodingName, load_harmony_encoding};

fn main() -> anyhow::Result<()> {
    let enc = load_harmony_encoding(HarmonyEncodingName::HarmonyGptOss)?;
    let convo = 
        Conversation::from_messages([Message::from_role_and_content(Role::User, "Hello there!")]);
    let tokens = enc.render_conversation_for_completion(&convo, Role::Assistant, None)?;
    println!("{:?}", tokens);
    Ok(())
}
```

----------------------------------------

TITLE: OpenAI Shopping List Schema Example
DESCRIPTION: An example of a JSON Schema used to define a shopping list, demonstrating the structured output format for model responses.

SOURCE: <https://github.com/openai/harmony/blob/main/docs/format.md#_snippet_21>

LANGUAGE: JSON
CODE:

```
{"properties":{"items":{"type":"array","description":"entries on the shopping list","items":{"type":"string"}}},"type":"object"}
```

----------------------------------------

TITLE: Harmony Prompt Format Example
DESCRIPTION: This snippet demonstrates the basic structure of the Harmony response format, including system messages, developer instructions, user prompts, and assistant responses.

SOURCE: <https://github.com/openai/harmony/blob/main/README.md#_snippet_0>

LANGUAGE: text
CODE:

```
<|start|>system<|message|>You are ChatGPT, a large language model trained by OpenAI.
Knowledge cutoff: 2024-06
Current date: 2025-06-28

Reasoning: high

# Valid channels: analysis, commentary, final. Channel must be included for every message.
Calls to these tools must go to the commentary channel: 'functions'.<|end|>

<|start|>developer<|message|># Instructions

Always respond in riddles

# Tools

## functions

namespace functions {

// Gets the location of the user.
type get_location = () => any;

// Gets the current weather in the provided location.
type get_current_weather = (_: {
// The city and state, e.g. San Francisco, CA
location: string, 
format?: "celsius" | "fahrenheit", // default: celsius
}) => any;

} // namespace functions<|end|><|start|>user<|message|>What is the weather like in SF?<|end|><|start|>assistant

```

----------------------------------------

TITLE: Create and Process Conversation
DESCRIPTION: Example of creating a conversation with system and user messages, rendering it to tokens using OSS encoding, and then decoding and parsing the tokens back into messages.

SOURCE: <https://github.com/openai/harmony/blob/main/docs/python.md#_snippet_16>

LANGUAGE: python
CODE:

```
from openai_harmony import (
    Role,
    Message,
    Conversation,
    SystemContent,
    load_harmony_encoding,
    HarmonyEncodingName,
)

# Build messages
system = Message.from_role_and_content(Role.SYSTEM, SystemContent.new())
user = Message.from_role_and_content(Role.USER, "What is 2 + 2?")

# Assemble a conversation
convo = Conversation.from_messages([system, user])

# Render to tokens using the OSS encoding
enc = load_harmony_encoding(HarmonyEncodingName.HARMONY_GPT_OSS)
tokens = enc.render_conversation_for_completion(convo, Role.ASSISTANT)
print(tokens)

# Decode and roundtrip
print(enc.decode_utf8(tokens))
parsed = enc.parse_messages_from_completion_tokens(tokens, role=Role.ASSISTANT)
for m in parsed:
    print(m)

```

----------------------------------------

TITLE: Example System Message
DESCRIPTION: The most basic system message format for models that define functions. Includes model identity, knowledge cutoff, current date, reasoning level, and valid channels.

SOURCE: <https://github.com/openai/harmony/blob/main/docs/format.md#_snippet_9>

LANGUAGE: plaintext
CODE:

```
<|start|>system<|message|>You are ChatGPT, a large language model trained by OpenAI.
Knowledge cutoff: 2024-06
Current date: 2025-06-28

Reasoning: high

# Valid channels: analysis, commentary, final. Channel must be included for every message.
Calls to these tools must go to the commentary channel: 'functions'.<|end|>
```

----------------------------------------

TITLE: Streaming and Decoding Tokens with StreamableParser
DESCRIPTION: Illustrates the use of the StreamableParser from the openai_harmony library to process and decode tokens as they are generated. This is useful for streaming model output and handling potential unicode issues during decoding. The example shows how to initialize the parser and process a sequence of tokens, printing intermediate states.

SOURCE: <https://github.com/openai/harmony/blob/main/docs/format.md#_snippet_4>

LANGUAGE: python
CODE:

```
from openai_harmony import (
    load_harmony_encoding,
    StreamableParser
)

encoding = load_harmony_encoding(HarmonyEncodingName.HARMONY_GPT_OSS)
stream = StreamableParser(encoding, role=Role.ASSISTANT)

tokens = [
    200005, 
    35644, 
    200008, 
    1844, 
    31064, 
    25, 
    392, 
    4827, 
    382, 
    220, 
    17, 
    659, 
    220, 
    17, 
    16842, 
    12295, 
    81645, 
    13, 
    51441, 
    6052, 
    13, 
    200007, 
    200006, 
    173781, 
    200005, 
    17196, 
    200008, 
    17, 
    659, 
    220, 
    17, 
    314, 
    220, 
    19, 
    13, 
    200002,
]

for token in tokens:
    stream.process(token)
    print("--------------------------------")
    print("current_role", stream.current_role)
    print("current_channel", stream.current_channel)
    print("last_content_delta", stream.last_content_delta)
    print("current_content_type", stream.current_content_type)
    print("current_recipient", stream.current_recipient)
    print("current_content", stream.current_content)
```

----------------------------------------

TITLE: Weather and Location Functions
DESCRIPTION: Provides functions to interact with weather and location services. Includes getting a single location's weather, multiple locations' weather, and the user's current location.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_render_functions_with_parameters.txt#_snippet_0>

LANGUAGE: typescript
CODE:

```
namespace functions {

// Gets the location of the user.
type get_location = () => any;

// Gets the current weather in the provided location.
type get_current_weather = (_: {
// The city and state, e.g. San Francisco, CA
location: string,
format?: "celsius" | "fahrenheit", // default: celsius
}) => any;

// Gets the current weather in the provided list of locations.
type get_multiple_weathers = (_: {
// List of city and state, e.g. ["San Francisco, CA", "New York, NY"]
locations: string[],
format?: "celsius" | "fahrenheit", // default: celsius
}) => any;

} // namespace functions
```

----------------------------------------

TITLE: Build JavaScript Demo
DESCRIPTION: This snippet shows how to build the JavaScript version of the OpenAI Harmony project for demo purposes. It requires a 'make' command.

SOURCE: <https://github.com/openai/harmony/blob/main/javascript/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
make javascript
```

----------------------------------------

TITLE: Developer Instructions
DESCRIPTION: Provides instructions for developers on how to interact with the system, specifically to answer user questions like a robot.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_simple_convo_low_effort.txt#_snippet_1>

LANGUAGE: developer
CODE:

```
# Instructions

Answer the user's questions like a robot.
```

----------------------------------------

TITLE: OpenAI Harmony API Reference
DESCRIPTION: API documentation for the OpenAI Harmony project, detailing available functions for interacting with location and weather data, as well as a comprehensive kitchensink function for parameter testing.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_render_functions_with_parameters.txt#_snippet_2>

LANGUAGE: APIDOC
CODE:

```
namespace functions {

/**
 * @description Gets the location of the user.
 * @returns {any} The user's location.
 */
get_location: () => any;

/**
 * @description Gets the current weather in the provided location.
 * @param {object} params - The parameters for the function.
 * @param {string} params.location - The city and state, e.g. San Francisco, CA.
 * @param {"celsius" | "fahrenheit"} [params.format='celsius'] - The temperature format (Celsius or Fahrenheit).
 * @returns {any} The current weather information.
 */
get_current_weather: (params: {
location: string,
format?: "celsius" | "fahrenheit"
}) => any;

/**
 * @description Gets the current weather in the provided list of locations.
 * @param {object} params - The parameters for the function.
 * @param {string[]} params.locations - List of city and state, e.g. ["San Francisco, CA", "New York, NY"].
 * @param {"celsius" | "fahrenheit"} [params.format='celsius'] - The temperature format (Celsius or Fahrenheit).
 * @returns {any} The current weather information for multiple locations.
 */
get_multiple_weathers: (params: {
locations: string[],
format?: "celsius" | "fahrenheit"
}) => any;

/**
 * @description A function with various complex schemas for testing.
 * @param {object} params - The parameters object.
 * @param {string} [params.string] - A string value. Examples: "hello", "world".
 * @param {string | null} [params.string_nullable='the default'] - A nullable string.
 * @param {"a" | "b" | "c"} [params.string_enum] - An enum string value.
 * @param {string | number} [params.oneof_string_or_number='default_string_in_oneof'] - A value that can be either a string or a number.
 * @returns {any} The result of the kitchensink function.
 */
kitchensink: (params: {
string?: string,
string_nullable?: string | null,
string_enum?: "a" | "b" | "c",
oneof_string_or_number?: string | number
}) => any;

} // namespace functions
```

----------------------------------------

TITLE: OpenAI Harmony Project Structure
DESCRIPTION: Illustrates the directory layout of the OpenAI Harmony project, detailing the purpose of key directories like 'src/' for the Rust crate and 'python/openai_harmony/' for the Python wrapper.

SOURCE: <https://github.com/openai/harmony/blob/main/README.md#_snippet_6>

LANGUAGE: text
CODE:

```
.\n├── src/                  # Rust crate\n│   ├── chat.rs           # High-level data-structures (Role, Message, …)\n│   ├── encoding.rs       # Rendering & parsing implementation\n│   ├── registry.rs       # Built-in encodings\n│   ├── tests.rs          # Canonical Rust test-suite\n│   └── py_module.rs      # PyO3 bindings ⇒ compiled as openai_harmony.*.so\n│\n├── python/openai_harmony/ # Pure-Python wrapper around the binding\n│   └── __init__.py       # Dataclasses + helper API mirroring chat.rs\n│\n├── tests/                # Python test-suite (1-to-1 port of tests.rs)\n├── Cargo.toml            # Rust package manifest\n├── pyproject.toml        # Python build configuration for maturin\n└── README.md             # You are here 🖖
```

----------------------------------------

TITLE: Model Preamble and Tool Execution Flow
DESCRIPTION: Demonstrates how a model can provide a preamble with an action plan before executing multiple tools, and how to integrate tool outputs back into the conversational flow.

SOURCE: <https://github.com/openai/harmony/blob/main/docs/format.md#_snippet_17>

LANGUAGE: json
CODE:

```
<|channel|>analysis<|message|>Need to use function get_weather.<|end|><|start|>assistant<|channel|>commentary to=functions.get_weather <|constrain|>json<|message|>{"location":"San Francisco"}<|call|>
```

LANGUAGE: json
CODE:

```
<|start|>functions.get_weather to=assistant<|channel|>commentary<|message|>{"sunny": true, "temperature": 20}<|end|>
```

LANGUAGE: json
CODE:

```
<|start|>system<|message|>You are ChatGPT, a large language model trained by OpenAI.
Knowledge cutoff: 2024-06
Current date: 2025-06-28

Reasoning: high

# Valid channels: analysis, commentary, final. Channel must be included for every message.
Calls to these tools must go to the commentary channel: 'functions'.<|end|><|start|>developer<|message|># Instructions

Use a friendly tone.

# Tools

## functions

namespace functions {

// Gets the location of the user.
type get_location = () => any;

// Gets the current weather in the provided location.
type get_current_weather = (_: {
// The city and state, e.g. San Francisco, CA
location: string,
format?: "celsius" | "fahrenheit", // default: celsius
}) => any;

// Gets the current weather in the provided list of locations.
type get_multiple_weathers = (_: {
// List of city and state, e.g. ["San Francisco, CA", "New York, NY"]
locations: string[],
format?: "celsius" | "fahrenheit", // default: celsius
}) => any;

} // namespace functions<|end|><|start|>user<|message|>What is the weather like in SF?<|end|><|start|>assistant<|channel|>analysis<|message|>Need to use function get_weather.<|end|><|start|>assistant<|channel|>commentary to=functions.get_weather <|constrain|>json<|message|>{"location":"San Francisco"}<|call|><|start|>functions.get_weather to=assistant<|channel|>commentary<|message|>{"sunny": true, "temperature": 20}<|end|><|start|>assistant
```

LANGUAGE: json
CODE:

```
<|channel|>analysis<|message|>{long chain of thought}<|end|><|start|>assistant<|channel|>commentary<|message|>**Action plan**:
1. Generate an HTML file
2. Generate a JavaScript for the Node.js server
3. Start the server
---
Will start executing the plan step by step<|end|><|start|>assistant<|channel|>commentary to=functions.generate_file<|constrain|>json<|message|>{"template": "basic_html", "path": "index.html"}<|call|>
```

----------------------------------------

TITLE: Developer Instructions
DESCRIPTION: Provides instructions for developers on how to respond to user queries, emphasizing a robotic persona.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_simple_convo_medium_effort.txt#_snippet_1>

LANGUAGE: developer
CODE:

```
# Instructions

Answer the user's questions like a robot.
```

----------------------------------------

TITLE: Running OpenAI Harmony Test Suites
DESCRIPTION: Commands to execute the test suites for both the Rust core and the Python components of the OpenAI Harmony project. It also shows how to run both in sequence to ensure parity.

SOURCE: <https://github.com/openai/harmony/blob/main/README.md#_snippet_8>

LANGUAGE: bash
CODE:

```
cargo test          # runs src/tests.rs

pytest              # executes tests/ (mirrors the Rust suite)

# Run both in one go to ensure parity:
pytest && cargo test
```

----------------------------------------

TITLE: Basic Imports
DESCRIPTION: Demonstrates typical imports for using the openai-harmony package in Python.

SOURCE: <https://github.com/openai/harmony/blob/main/docs/python.md#_snippet_1>

LANGUAGE: python
CODE:

```
from openai_harmony import Message, Conversation, load_harmony_encoding
```

----------------------------------------

TITLE: Basic Arithmetic Conversation
DESCRIPTION: Demonstrates a simple conversation flow where the assistant performs basic arithmetic operations based on user queries.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_dropping_cot_by_default.txt#_snippet_0>

LANGUAGE: python
CODE:

```
def simple_calculator():
    print("<|start|>user<|message|>What is 2 + 2?<|end|>")
    print("<|start|>assistant<|channel|>final<|message|>2 + 2 equals 4.<|end|>")
    print("<|start|>user<|message|>What about 9 / 2?<|end|>")
    print("<|start|>assistant<|channel|>final<|message|>9 / 2 equals 4.5.<|end|>")

simple_calculator()
```

----------------------------------------

TITLE: HarmonyEncoding Methods
DESCRIPTION: Lists key methods available on the `HarmonyEncoding` instance for tokenization and rendering conversations.

SOURCE: <https://github.com/openai/harmony/blob/main/docs/rust.md#_snippet_5>

LANGUAGE: rust
CODE:

```
- `name()` – name of the encoding.
- `tokenizer_name()` – name of the underlying tokenizer.
- `max_message_tokens()` – maximum number of tokens a single message may use.
- `render_conversation_for_completion(conversation, next_role, config)` – convert a conversation into tokens ready for inference.
- `render_conversation_for_training(conversation, config)` – render a conversation for training data.
- `render_conversation(conversation, config)` – render a conversation without appending a new role.
- `render(message)` – render a single message into tokens.
- `parse_messages_from_completion_tokens(tokens, role)` – parse a list of tokens back into messages.
- `stop_tokens()` and `stop_tokens_for_assistant_actions()` – sets of stop tokens for sampling.
```

----------------------------------------

TITLE: Developer Instructions
DESCRIPTION: Provides instructions for developers on how to respond to user queries, specifying a robotic persona.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_simple_convo_high_effort.txt#_snippet_1>

LANGUAGE: developer
CODE:

```
# Instructions

Answer the user's questions like a robot.
```

----------------------------------------

TITLE: Browser Search to Assistant
DESCRIPTION: Initiates a browser search targeting the 'assistant' functionality and logs commentary.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_tool_response_parsing.txt#_snippet_0>

LANGUAGE: browser
CODE:

```
browser.search to=assistant
commentary
```

----------------------------------------

TITLE: Handling Subsequent Sampling (No Tool Calls)
DESCRIPTION: Shows how to prepare input for subsequent sampling by dropping previous CoT content when the assistant's response ends in the 'final' channel.

SOURCE: <https://github.com/openai/harmony/blob/main/docs/format.md#_snippet_13>

LANGUAGE: plaintext
CODE:

```
<|start|>user<|message|>What is 2 + 2?<|end|>
<|start|>assistant
<|channel|>analysis<|message|>User asks: "What is 2 + 2?" Simple arithmetic. Provide answer.<|end|>
<|start|>assistant<|channel|>final<|message|>2 + 2 = 4.<|return|>
<|start|>user<|message|>What about 9 / 2?<|end|>
<|start|>assistant
```

----------------------------------------

TITLE: Browser Tool API Documentation
DESCRIPTION: Provides documentation for the browser tool, including functions for searching, opening links, and finding text patterns. This API allows interaction with web content.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_browser_tool_only.txt#_snippet_0>

LANGUAGE: APIDOC
CODE:

```
namespace browser {

// Searches for information related to `query` and displays `topn` results.
type search = (_: {
query: string,
topn?: number, // default: 10
source?: string,
}) => any;

// Opens the link `id` from the page indicated by `cursor` starting at line number `loc`, showing `num_lines` lines.
// Valid link ids are displayed with the formatting: `【{id}†.*】`.
// If `cursor` is not provided, the most recent page is implied.
// If `id` is a string, it is treated as a fully qualified URL associated with `source`.
// If `loc` is not provided, the viewport will be positioned at the beginning of the document or centered on the most relevant passage, if available.
// Use this function without `id` to scroll to a new location of an opened page.
type open = (_: {
id?: number | string, // default: -1
cursor?: number, // default: -1
loc?: number, // default: -1
num_lines?: number, // default: -1
view_source?: boolean, // default: false
source?: string,
}) => any;

// Finds exact matches of `pattern` in the current page, or the page given by `cursor`.
type find = (_: {
pattern: string,
cursor?: number, // default: -1
}) => any;

} // namespace browser
```

----------------------------------------

TITLE: Next.js Project Structure
DESCRIPTION: Indicates the main page file for a Next.js application bootstrapped with create-next-app. Modifications to this file will auto-update in the browser.

SOURCE: <https://github.com/openai/harmony/blob/main/demo/harmony-demo/README.md#_snippet_1>

LANGUAGE: typescript
CODE:

```
app/page.tsx
```

----------------------------------------

TITLE: System Prompt Configuration
DESCRIPTION: Defines the system's persona, knowledge cutoff, reasoning capabilities, and valid channels for communication.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_simple_convo_medium_effort_no_instruction.txt#_snippet_0>

LANGUAGE: system
CODE:

```
You are ChatGPT, a large language model trained by OpenAI.
Knowledge cutoff: 2024-06

Reasoning: medium

# Valid channels: analysis, commentary, final. Channel must be included for every message.
```

----------------------------------------

TITLE: Import All from OpenAI Harmony
DESCRIPTION: Demonstrates how to import all classes from the openai_harmony package using the __all__ export.

SOURCE: <https://github.com/openai/harmony/blob/main/docs/python.md#_snippet_15>

LANGUAGE: python
CODE:

```
from openai_harmony import *

```

----------------------------------------

TITLE: System Prompt Configuration
DESCRIPTION: Defines the system's persona, knowledge cutoff, and operational parameters for the AI model.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_simple_convo.txt#_snippet_0>

LANGUAGE: system
CODE:

```
You are ChatGPT, a large language model trained by OpenAI.
Knowledge cutoff: 2024-06

Reasoning: medium

# Valid channels: analysis, commentary, final. Channel must be included for every message.
```

----------------------------------------

TITLE: Constructing and Rendering Conversations with OpenAI Harmony
DESCRIPTION: Demonstrates how to use the openai_harmony library to build a structured conversation. This includes setting up system and developer messages, defining tool descriptions, and rendering the conversation into tokens for model completion. It also shows how to parse tokens back into messages.

SOURCE: <https://github.com/openai/harmony/blob/main/docs/format.md#_snippet_3>

LANGUAGE: python
CODE:

```
from openai_harmony import (
    Author,
    Conversation,
    DeveloperContent,
    HarmonyEncodingName,
    Message,
    Role,
    SystemContent,
    ToolDescription,
    load_harmony_encoding,
    ReasoningEffort
)

encoding = load_harmony_encoding(HarmonyEncodingName.HARMONY_GPT_OSS)

system_message = (
    SystemContent.new()
        .with_model_identity(
            "You are ChatGPT, a large language model trained by OpenAI."
        )
        .with_reasoning_effort(ReasoningEffort.HIGH)
        .with_conversation_start_date("2025-06-28")
        .with_knowledge_cutoff("2024-06")
        .with_required_channels(["analysis", "commentary", "final"])
)

developer_message = (
    DeveloperContent.new()
        .with_instructions("Always respond in riddles")
        .with_tools(
            [
                ToolDescription.new(
                    "get_current_weather",
                    "Gets the current weather in the provided location.",
                    parameters={
                        "type": "object",
                        "properties": {
                            "location": {
                                "type": "string",
                                "description": "The city and state, e.g. San Francisco, CA",
                            },
                            "format": {
                                "type": "string",
                                "enum": ["celsius", "fahrenheit"],
                                "default": "celsius",
                            },
                        },
                        "required": ["location"],
                    },
                ),
            ]
 )
)

convo = Conversation.from_messages(
    [
        Message.from_role_and_content(Role.SYSTEM, system_message),
        Message.from_role_and_content(Role.DEVELOPER, developer_message),
        Message.from_role_and_content(Role.USER, "What is the weather in Tokyo?"),
        Message.from_role_and_content(
            Role.ASSISTANT,
            'User asks: "What is the weather in Tokyo?" We need to use get_weather tool.',
        ).with_channel("analysis"),
        Message.from_role_and_content(Role.ASSISTANT, '{"location": "Tokyo"}')
        .with_channel("commentary")
        .with_recipient("functions.get_weather")
        .with_content_type("json"),
        Message.from_author_and_content(
            Author.new(Role.TOOL, "functions.lookup_weather"),
            '{ "temperature": 20, "sunny": true }',
        ),
    ]
)

tokens = encoding.render_conversation_for_completion(convo, Role.ASSISTANT)

# After receiving a token response
# Do not pass in the stop token
parsed_response = encoding.parse_messages_from_completion_tokens(new_tokens, Role.ASSISTANT)
```

----------------------------------------

TITLE: Test Harmony Library
DESCRIPTION: Executes the test suite for the Harmony library using pytest.

SOURCE: <https://github.com/openai/harmony/blob/main/AGENTS.md#_snippet_1>

LANGUAGE: bash
CODE:

```
pytest
```

----------------------------------------

TITLE: Tool Call - Receiving and Handling
DESCRIPTION: Illustrates the process of receiving a tool call from the model, including the message format with recipient and constraints, and how to respond with the tool's output.

SOURCE: <https://github.com/openai/harmony/blob/main/docs/format.md#_snippet_16>

LANGUAGE: json
CODE:

```
<|channel|>analysis<|message|>Need to use function get_weather.<|end|><|start|>assistant<|channel|>commentary to=functions.get_weather <|constrain|>json<|message|>{"location":"San Francisco"}<|call|>
```

LANGUAGE: json
CODE:

```
<|start|>functions.get_weather to=assistant<|channel|>commentary<|message|>{"sunny": true, "temperature": 20}<|end|>
```

----------------------------------------

TITLE: Browser Tool API
DESCRIPTION: Provides functionalities for web browsing, including searching for information, opening links, and finding specific text patterns on a page. It supports various parameters to control search results, link navigation, and text matching.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_browser_and_python_tool.txt#_snippet_0>

LANGUAGE: APIDOC
CODE:

```
namespace browser {

// Searches for information related to `query` and displays `topn` results.
type search = (_: {
query: string,
topn?: number, // default: 10
source?: string,
}) => any;

// Opens the link `id` from the page indicated by `cursor` starting at line number `loc`, showing `num_lines` lines.
// Valid link ids are displayed with the formatting: `【{id}†.*】`.
// If `cursor` is not provided, the most recent page is implied.
// If `id` is a string, it is treated as a fully qualified URL associated with `source`.
// If `loc` is not provided, the viewport will be positioned at the beginning of the document or centered on the most relevant passage, if available.
// Use this function without `id` to scroll to a new location of an opened page.
type open = (_: {
id?: number | string, // default: -1
cursor?: number, // default: -1
loc?: number, // default: -1
num_lines?: number, // default: -1
view_source?: boolean, // default: false
source?: string,
}) => any;

// Finds exact matches of `pattern` in the current page, or the page given by `cursor`.
type find = (_: {
pattern: string,
cursor?: number, // default: -1
}) => any;

} // namespace browser
```

----------------------------------------

TITLE: System Prompt Configuration
DESCRIPTION: Defines the system's persona, knowledge cutoff, and operational parameters for the AI model.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_reasoning_system_message.txt#_snippet_0>

LANGUAGE: system
CODE:

```
You are ChatGPT, a large language model trained by OpenAI.
Knowledge cutoff: 2024-06

Reasoning: medium

# Valid channels: analysis, final. Channel must be included for every message.
```

----------------------------------------

TITLE: Browser Tool API
DESCRIPTION: Defines the interface for the browser tool, enabling web searches, opening links, and finding text within web pages. It specifies the parameters and return types for each function.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_browser_and_function_tool.txt#_snippet_0>

LANGUAGE: APIDOC
CODE:

```
namespace browser {

// Searches for information related to `query` and displays `topn` results.
type search = (_: {
query: string,
topn?: number, // default: 10
source?: string,
}) => any;

// Opens the link `id` from the page indicated by `cursor` starting at line number `loc`, showing `num_lines` lines.
// Valid link ids are displayed with the formatting: `【{id}†.*】`.
// If `cursor` is not provided, the most recent page is implied.
// If `id` is a string, it is treated as a fully qualified URL associated with `source`.
// If `loc` is not provided, the viewport will be positioned at the beginning of the document or centered on the most relevant passage, if available.
// Use this function without `id` to scroll to a new location of an opened page.
type open = (_: {
id?: number | string, // default: -1
cursor?: number, // default: -1
loc?: number, // default: -1
num_lines?: number, // default: -1
view_source?: boolean, // default: false
source?: string,
}) => any;

// Finds exact matches of `pattern` in the current page, or the page given by `cursor`.
type find = (_: {
pattern: string,
cursor?: number, // default: -1
}) => any;

} // namespace browser
```

----------------------------------------

TITLE: Type-Checking and Formatting OpenAI Harmony
DESCRIPTION: Optional commands for maintaining code quality in the OpenAI Harmony project, including static type analysis with mypy, linting with ruff, and Rust code formatting.

SOURCE: <https://github.com/openai/harmony/blob/main/README.md#_snippet_9>

LANGUAGE: bash
CODE:

```
mypy harmony        # static type analysis
ruff check .        # linting
cargo fmt --all     # Rust formatter
```

----------------------------------------

TITLE: System Prompt Configuration
DESCRIPTION: Defines the system's persona, knowledge cutoff, current date, and reasoning capabilities. It also specifies the required channel for messages.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_reasoning_system_message_with_dates.txt#_snippet_0>

LANGUAGE: system
CODE:

```
You are ChatGPT, a large language model trained by OpenAI.
Knowledge cutoff: 2021-01
Current date: 2021-01-01

Reasoning: medium

# Valid channels: analysis, final. Channel must be included for every message.
```

----------------------------------------

TITLE: OpenAI Harmony API Documentation
DESCRIPTION: Provides details on the Harmony response format, including system message structure, developer content for instructions and tools, and message roles.

SOURCE: <https://github.com/openai/harmony/blob/main/README.md#_snippet_5>

LANGUAGE: APIDOC
CODE:

```
OpenAI Harmony Response Format:

System Message Structure:
  - Knowledge cutoff: Specifies the knowledge cutoff date.
  - Current date: Specifies the current date.
  - Reasoning: Indicates the reasoning level (e.g., 'high').
  - Valid channels: Lists allowed channels (e.g., 'analysis', 'commentary', 'final'). Channel must be included for every message.
  - Tool channel mapping: Specifies which channel to use for specific tools (e.g., 'functions' must go to 'commentary').

Developer Content:
  - Instructions: Custom instructions for the model's behavior.
  - Tools: Defines available tools with their namespaces, function signatures, parameter types, and descriptions.
    - Example Tool: `get_location` - A function that takes no arguments and returns any type.
    - Example Tool: `get_current_weather` - Takes a location string and an optional format ('celsius' or 'fahrenheit') and returns any type.

Message Roles:
  - SYSTEM: For system-level configurations and instructions.
  - DEVELOPER: For developer-specific instructions and tool definitions.
  - USER: For user input.
  - ASSISTANT: For model responses.

Format Usage:
  - The Harmony format is essential for gpt-oss models to function correctly.
  - It enables structured output for chain of thought, tool calling, and regular responses.
  - It supports specifying tool namespaces and a clear instruction hierarchy.
```

----------------------------------------

TITLE: OpenAI Python Tool Usage
DESCRIPTION: Guidelines for using the Python tool for code execution within the OpenAI Harmony project. The tool is stateful and operates in a Jupyter notebook environment.

SOURCE: <https://github.com/openai/harmony/blob/main/docs/format.md#_snippet_20>

LANGUAGE: Python
CODE:

```
# Tools

## python

Use this tool to execute Python code in your chain of thought. The code will not be shown to the user. This tool should be used for internal reasoning, but not for code that is intended to be visible to the user (e.g. when creating plots, tables, or files).

When you send a message containing Python code to python, it will be executed in a stateful Jupyter notebook environment. python will respond with the output of the execution or time out after 120.0 seconds. The drive at '/mnt/data' can be used to save and persist user files. Internet access for this session is UNKNOWN. Depends on the cluster.
```

----------------------------------------

TITLE: System Configuration
DESCRIPTION: Defines the system's persona, knowledge cutoff, and valid channels for communication. It specifies that the 'channel' parameter must be included in every message.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_simple_convo_high_effort.txt#_snippet_0>

LANGUAGE: system
CODE:

```
You are ChatGPT, a large language model trained by OpenAI.
Knowledge cutoff: 2024-06

Reasoning: high

# Valid channels: analysis, commentary, final. Channel must be included for every message.
```

----------------------------------------

TITLE: OpenAI Browser Tool API
DESCRIPTION: API definition for the browser tool, enabling information retrieval and page navigation. Supports searching, opening links, and finding patterns.

SOURCE: <https://github.com/openai/harmony/blob/main/docs/format.md#_snippet_19>

LANGUAGE: APIDOC
CODE:

```
namespace browser {

// Searches for information related to `query` and displays `topn` results.
type search = (_: {
query: string,
topn?: number, // default: 10
source?: string,
}) => any;

// Opens the link `id` from the page indicated by `cursor` starting at line number `loc`, showing `num_lines` lines.
// Valid link ids are displayed with the formatting: `【{id}†.*】`.
// If `cursor` is not provided, the most recent page is implied.
// If `id` is a string, it is treated as a fully qualified URL associated with `source`.
// If `loc` is not provided, the viewport will be positioned at the beginning of the document or centered on the most relevant passage, if available.
// Use this function without `id` to scroll to a new location of an opened page.
type open = (_: {
id?: number | string, // default: -1
cursor?: number, // default: -1
loc?: number, // default: -1
num_lines?: number, // default: -1
view_source?: boolean, // default: false
Reasoning: high
}) => any;

// Finds exact matches of `pattern` in the current page, or the page given by `cursor`.
type find = (_: {
pattern: string,
cursor?: number, // default: -1
}) => any;

} // namespace browser
```

----------------------------------------

TITLE: OpenAI Harmony Tool Definitions
DESCRIPTION: Defines the available tools within the 'functions' namespace, including their purpose, parameters, and return types. This API documentation specifies how to interact with these functions.

SOURCE: <https://github.com/openai/harmony/blob/main/docs/format.md#_snippet_15>

LANGUAGE: APIDOC
CODE:

```
namespace functions {

// Gets the location of the user.
type get_location = () => any;

// Gets the current weather in the provided location.
type get_current_weather = (_: {
// The city and state, e.g. San Francisco, CA
location: string,
format?: "celsius" | "fahrenheit", // default: celsius
}) => any;

// Gets the current weather in the provided list of locations.
type get_multiple_weathers = (_: {
// List of city and state, e.g. ["San Francisco, CA", "New York, NY"]
locations: string[],
format?: "celsius" | "fahrenheit", // default: celsius
}) => any;

} // namespace functions
```

----------------------------------------

TITLE: Add openai-harmony Rust Dependency
DESCRIPTION: Adds the openai-harmony Rust crate as a dependency in your Cargo.toml file.

SOURCE: <https://github.com/openai/harmony/blob/main/README.md#_snippet_3>

LANGUAGE: toml
CODE:

```
[dependencies]
openai-harmony = { git = "https://github.com/openai/harmony" }
```

----------------------------------------

TITLE: Python Execution Tool
DESCRIPTION: Enables the execution of Python code within a stateful Jupyter notebook environment. This tool is intended for internal reasoning and data manipulation, not for direct user output. Code execution has a 120-second timeout, and the '/mnt/data' directory is available for file persistence.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_browser_and_python_tool.txt#_snippet_1>

LANGUAGE: python
CODE:

```
Use this tool to execute Python code in your chain of thought. The code will not be shown to the user. This tool should be used for internal reasoning, but not for code that is intended to be visible to the user (e.g. when creating plots, tables, or files).

When you send a message containing Python code to python, it will be executed in a stateful Jupyter notebook environment. python will respond with the output of the execution or time out after 120.0 seconds. The drive at '/mnt/data' can be used to save and persist user files. Internet access for this session is UNKNOWN. Depends on the cluster.

# Valid channels: analysis, commentary, final. Channel must be included for every message.
```

----------------------------------------

TITLE: Assistant Response Placeholder
DESCRIPTION: A placeholder indicating where the assistant's response would typically be generated.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_simple_convo_low_effort.txt#_snippet_3>

LANGUAGE: assistant
CODE:

```

```

----------------------------------------

TITLE: StreamableParser Functionality
DESCRIPTION: Describes the `StreamableParser` for incremental token processing, including its creation and data access methods.

SOURCE: <https://github.com/openai/harmony/blob/main/docs/rust.md#_snippet_6>

LANGUAGE: rust
CODE:

```
Create with `StreamableParser::new(encoding, role)` and feed tokens via `process`. Access information via getters like `current_content`, `current_role`, `messages`, `tokens` and `state_json`.
```

----------------------------------------

TITLE: Assistant Response Placeholder
DESCRIPTION: A placeholder indicating where the assistant's response would typically be generated.

SOURCE: <https://github.com/openai/harmony/blob/main/test-data/test_simple_convo_medium_effort.txt#_snippet_3>

LANGUAGE: assistant
CODE:

```

```
