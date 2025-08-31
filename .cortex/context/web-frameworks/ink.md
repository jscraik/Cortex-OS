========================

# CODE SNIPPETS

TITLE: Install Ink UI
DESCRIPTION: Installs the Ink UI package using npm. This assumes you have already set up Ink.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/readme.md#_snippet_0

LANGUAGE: sh
CODE:

```
npm install @inkjs/ui
```

---

TITLE: Spinner Component
DESCRIPTION: Example usage of the Spinner component, which indicates that a process is ongoing and the CLI is waiting for completion.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/readme.md#_snippet_7

LANGUAGE: jsx
CODE:

```
import { Spinner } from '@inkjs/ui';

<Spinner label="Loading" />;
```

---

TITLE: Spinner Usage Example
DESCRIPTION: Demonstrates how to use the Spinner component from @inkjs/ui in an Ink application. It shows the basic import and rendering with a label.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/spinner.md#_snippet_0

LANGUAGE: tsx
CODE:

```
import React from 'react';
import {render, Box} from 'ink';
import {Spinner} from '@inkjs/ui';

function Example() {
	return <Spinner label="Loading" />;
}

render(<Example />);
```

---

TITLE: Usage Example: ProgressBar
DESCRIPTION: Demonstrates how to use the ProgressBar component from '@inkjs/ui'. It simulates progress from 0 to 100 using `useState` and `useEffect` hooks, rendering the progress bar within an Ink `Box`.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/progress-bar.md#_snippet_0

LANGUAGE: tsx
CODE:

```
import React, {useEffect, useState} from 'react';
import {render, Box} from 'ink';
import {ProgressBar} from '@inkjs/ui';

function Example() {
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		if (progress === 100) {
			return;
		}

		const timer = setTimeout(() => {
			setProgress(progress + 1);
		}, 50);

		return () => {
			clearInterval(timer);
		};
	}, [progress]);

	return (
		<Box width={30}>
			<ProgressBar value={progress} />
		</Box>
	);
}

render(<Example />);
```

---

TITLE: ProgressBar Component
DESCRIPTION: Example usage of the ProgressBar component, an extension of Spinner that allows displaying a calculated progress percentage.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/readme.md#_snippet_8

LANGUAGE: jsx
CODE:

```
import { ProgressBar } from '@inkjs/ui';

// `progress` must be a number between 0 and 100
<ProgressBar value={progress} />;
```

---

TITLE: Select Component
DESCRIPTION: Example usage of the Select component, which displays a scrollable list of options for the user to choose from.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/readme.md#_snippet_5

LANGUAGE: jsx
CODE:

```
import { Select } from '@inkjs/ui';

<Select
	options={[
		{
			label: 'Red',
			value: 'red',
		},
		{
			label: 'Green',
			value: 'green',
		},
		{
			label: 'Yellow',
			value: 'yellow',
		},
		/* ... */
	]}
	onChange={newValue => {
		// `newValue` equals the `value` field of the selected option
		// For example, "yellow"
	}}
/>;
```

---

TITLE: ConfirmInput Component
DESCRIPTION: Example usage of the ConfirmInput component, which presents a common 'Y/n' prompt to confirm or cancel an operation.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/readme.md#_snippet_4

LANGUAGE: jsx
CODE:

```
import { ConfirmInput } from '@inkjs/ui';

<ConfirmInput
	onConfirm={() => {
		// confirmed
	}}
	onCancel={() => {
		// cancelled
	}}
/>;
```

---

TITLE: ConfirmInput Usage Example
DESCRIPTION: Demonstrates how to integrate the ConfirmInput component into a React Ink application. It shows how to manage state based on user confirmation or cancellation, providing a clear interactive flow for CLI operations.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/confirm-input.md#_snippet_0

LANGUAGE: tsx
CODE:

```
import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import {ConfirmInput} from '@inkjs/ui';

function Example() {
	const [choice, setChoice] = useState<'agreed' | 'disagreed' | undefined>();

	return (
		<Box gap={1}>
			{!choice && (
				<>
					<Text bold>Do you agree with terms of service?</Text>
					<ConfirmInput
						onConfirm={() => {
							setChoice('agreed');
						}}
						onCancel={() => {
							setChoice('disagreed');
						}}
					/>
				</>
			)}

			{choice === 'agreed' && <Text>I know you haven't read them, but ok</Text>}
			{choice === 'disagreed' && <Text>Ok, whatever</Text>}
		</Box>
	);
}

render(<Example />);
```

---

TITLE: ConfirmInput Component API
DESCRIPTION: API reference for the ConfirmInput component, detailing all available props, their types, default values, and descriptions. This guide helps developers customize the confirmation prompt's behavior and event handling.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/confirm-input.md#_snippet_1

LANGUAGE: APIDOC
CODE:

```
ConfirmInput Component API:

Props:

isDisabled:
  Type: boolean
  Default: false
  Description: When disabled, user input is ignored.

defaultChoice:
  Type: 'confirm' | 'cancel'
  Default: 'confirm'
  Description: Default choice.

submitOnEnter:
  Type: boolean
  Default: true
  Description: Confirm or cancel when user presses enter, depending on the defaultChoice value. Can be useful to disable when an explicit confirmation is required, such as pressing Y key.

onConfirm:
  Type: Function
  Description: Callback to trigger on confirmation.

onCancel:
  Type: Function
  Description: Callback to trigger on cancellation.
```

---

TITLE: Badge Usage Example
DESCRIPTION: Demonstrates the usage of the Badge component with various color props to display status indicators within an Ink application. It shows how to import and render badges with 'green', 'red', 'yellow', and 'blue' colors.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/badge.md#_snippet_0

LANGUAGE: tsx
CODE:

```
import React from 'react';
import {render, Box} from 'ink';
import {Badge} from '@inkjs/ui';

function Example() {
	return (
		<Box gap={2}>
			<Badge color="green">Pass</Badge>
			<Badge color="red">Fail</Badge>
			<Badge color="yellow">Warn</Badge>
			<Badge color="blue">Todo</Badge>
		</Box>
	);
}

render(<Example />);
```

---

TITLE: TextInput Component
DESCRIPTION: Example usage of the TextInput component for entering any single-line input with an optional autocomplete feature.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/readme.md#_snippet_1

LANGUAGE: jsx
CODE:

```
import { TextInput } from '@inkjs/ui';

<TextInput
	placeholder="Enter your name..."
	submit={name => {
		// `name` contains user input
	}}
/>;
```

---

TITLE: MultiSelect Component
DESCRIPTION: Example usage of the MultiSelect component, similar to Select but allows the user to choose multiple options from a list.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/readme.md#_snippet_6

LANGUAGE: jsx
CODE:

```
import { MultiSelect } from '@inkjs/ui';

<MultiSelect
	options={[
		{
			label: 'Red',
			value: 'red',
		},
		{
			label: 'Green',
			value: 'green',
		},
		{
			label: 'Yellow',
			value: 'yellow',
		},
		/* ... */
	]}
	onChange={newValue => {
		// `newValue` is an array of `value` fields of the selected options
		// For example, ["green", "yellow"]
	}}
/>;
```

---

TITLE: EmailInput Component
DESCRIPTION: Example usage of the EmailInput component for entering an email address. It offers domain autocompletion after the '@' character is entered.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/readme.md#_snippet_2

LANGUAGE: jsx
CODE:

```
import { EmailInput } from '@inkjs/ui';

<EmailInput
	placeholder="Enter email..."
	submit={email => {
		// `email` contains user input
	}}
/>;
```

---

TITLE: StatusMessage Usage Example
DESCRIPTION: Demonstrates how to use the StatusMessage component from '@inkjs/ui' with different variants (success, error, warning, info) within an Ink.js application.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/status-message.md#_snippet_0

LANGUAGE: tsx
CODE:

```
import React from 'react';
import {render, Box} from 'ink';
import {StatusMessage} from '@inkjs/ui';

function Example() {
	return (
		<Box flexDirection="column" padding={2}>
			<StatusMessage variant="success">Success</StatusMessage>
			<StatusMessage variant="error">Error</StatusMessage>
			<StatusMessage variant="warning">Warning</StatusMessage>
			<StatusMessage variant="info">Info</StatusMessage>
		</Box>
	);
}

render(<Example />);
```

---

TITLE: StatusMessage Component
DESCRIPTION: Example usage of the StatusMessage component, used to indicate a status when a longer explanation is required, offering different variants like success, error, warning, and info.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/readme.md#_snippet_10

LANGUAGE: jsx
CODE:

```
import { StatusMessage } from '@inkjs/ui';

<StatusMessage variant="success">
	New version is deployed to production
</StatusMessage>

<StatusMessage variant="error">
  Failed to deploy a new version of this app
</StatusMessage>

<StatusMessage variant="warning">
    Health checks aren't configured
</StatusMessage>

<StatusMessage variant="info">
    This version is already deployed
</StatusMessage>;
```

---

TITLE: Ink UI UnorderedList Usage Example
DESCRIPTION: Demonstrates how to use the UnorderedList component from @inkjs/ui to render a basic unordered list with nested items. It shows the import statements and the JSX structure required for creating hierarchical lists.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/unordered-list.md#_snippet_0

LANGUAGE: tsx
CODE:

```
import React from 'react';
import {render, Box, Text} from 'ink';
import {UnorderedList} from '@inkjs/ui';

function Example() {
	return (
		<UnorderedList>
			<UnorderedList.Item>
				<Text>Red</Text>
			</UnorderedList.Item>

			<UnorderedList.Item>
				<Text>Green</Text>

				<UnorderedList>
					<UnorderedList.Item>
						<Text>Light</Text>
					</UnorderedList.Item>

					<UnorderedList.Item>
						<Text>Dark</Text>
					</UnorderedList.Item>
				</UnorderedList>
			</UnorderedList.Item>

			<UnorderedList.Item>
				<Text>Blue</Text>
			</UnorderedList.Item>
		</UnorderedList>
	);
}

render(<Example />);
```

---

TITLE: Badge Component
DESCRIPTION: Example usage of the Badge component, used to indicate the status of an item, typically positioned near related elements.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/readme.md#_snippet_9

LANGUAGE: jsx
CODE:

```
import { Badge } from '@inkjs/ui';

<Badge color="green">Pass</Badge>
<Badge color="red">Fail</Badge>
<Badge color="yellow">Warn</Badge>
<Badge color="blue">Todo</Badge>;
```

---

TITLE: PasswordInput Component
DESCRIPTION: Example usage of the PasswordInput component for entering sensitive data like passwords or API keys. Input values are masked with asterisks.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/readme.md#_snippet_3

LANGUAGE: jsx
CODE:

```
import { PasswordInput } from '@inkjs/ui';

<PasswordInput
	placeholder="Enter password..."
	submit={password => {
		// `password` contains user input
	}}
/>;
```

---

TITLE: Ink UI Alert Component Usage Example
DESCRIPTION: This snippet shows how to import and use the Alert component from '@inkjs/ui' within a React Ink application. It demonstrates displaying alerts with various predefined variants like 'success', 'error', 'warning', and 'info', showcasing their visual differences.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/alert.md#_snippet_0

LANGUAGE: tsx
CODE:

```
import React from 'react';
import {render, Box} from 'ink';
import {Alert} from '@inkjs/ui';

function Example() {
	return (
		<Box flexDirection="column" width={60} gap={1}>
			<Alert variant="success">A new version of this CLI is available</Alert>

			<Alert variant="error">Your license is expired</Alert>

			<Alert variant="warning">
				Current version of this CLI has been deprecated
			</Alert>

			<Alert variant="info">API won't be available tomorrow night</Alert>
		</Box>
	);
}

render(<Example />);
```

---

TITLE: EmailInput Basic Usage
DESCRIPTION: Demonstrates the basic usage of the EmailInput component, capturing changes via the `onChange` prop.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/email-input.md#_snippet_0

LANGUAGE: tsx
CODE:

```
import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import {EmailInput} from '@inkjs/ui';

function Example() {
	const [value, setValue] = useState('');

	return (
		<Box flexDirection="column" gap={1}>
			<EmailInput placeholder="Enter email..." onChange={setValue} />
			<Text>Input value: "{value}"</Text>
		</Box>
	);
}

render(<Example />);
```

---

TITLE: Ink UI Select Component API
DESCRIPTION: Provides detailed documentation for the Ink UI `Select` component's available props, including their types, default values, and usage.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/select.md#_snippet_3

LANGUAGE: APIDOC
CODE:

```
Select Component Props:

isDisabled:
  Type: boolean
  Default: false
  Description: When disabled, user input is ignored.

visibleOptionCount:
  Type: number
  Default: 5
  Description: Number of visible options.

highlightText:
  Type: string
  Description: Highlight text in option labels.

options:
  Type: Array<{ label: string; value: string; }>
  Description: Options to display in the select list.

defaultValue:
  Type: string
  Description: Default value to pre-select.

onChange(value):
  Type: Function
  Description: Callback when the selected option changes.
  Parameters:
    value:
      Type: string
      Description: The value of the selected option.
```

---

TITLE: Ink UI Component API
DESCRIPTION: This documentation describes the properties and methods available for the Ink UI component. It covers configuration options for highlighting text, defining selectable options, setting default values, and handling user interactions like changes and submissions.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/multi-select.md#_snippet_4

LANGUAGE: APIDOC
CODE:

```
Ink UI Component API Reference:

Properties:

* highlightText
    * Type: `string`
    * Description: Highlight text in option labels.

* options
    * Type: `Array<{ label: string; value: string; }>`
    * Description: Defines the selectable options. Each option must have a `label` and a `value`.

* defaultValue
    * Type: `string[]`
    * Description: Sets the initial selected options.

Methods:

* onChange(value)
    * Description: Callback function invoked when the selected options change.
    * Parameters:
        * `value` (Type: `string[]`): An array containing the values of the currently selected options.

* onSubmit(value)
    * Description: Callback function invoked when the user submits the input (e.g., by pressing Enter).
    * Parameters:
        * `value` (Type: `string[]`): An array containing the values of the selected options at the time of submission.
```

---

TITLE: Ink UI Select Basic Usage
DESCRIPTION: Demonstrates the fundamental usage of the Select component. It renders a list of options and captures the user's selection via the `onChange` prop, updating a state variable.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/select.md#_snippet_0

LANGUAGE: tsx
CODE:

```
import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import {Select} from '@inkjs/ui';

function Example() {
	const [value, setValue] = useState<string | undefined>();

	return (
		<Box padding={2} flexDirection="column" gap={1}>
			<Select
				options={[
					{
						label: 'Red',
						value: 'red',
					},
					{
						label: 'Green',
						value: 'green',
					},
					{
						label: 'Yellow',
						value: 'yellow',
					},
					{
						label: 'Blue',
						value: 'blue',
					},
					{
						label: 'Magenta',
						value: 'magenta',
					},
					{
						label: 'Cyan',
						value: 'cyan',
					},
					{
						label: 'White',
						value: 'white',
					},
				]}
				onChange={setValue}
			/>

			<Text>Selected value: {value}</Text>
		</Box>
	);
}

render(<Example />);
```

---

TITLE: PasswordInput Component Props
DESCRIPTION: API documentation for the PasswordInput component, detailing its available props, their types, default values, and functionality.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/password-input.md#_snippet_3

LANGUAGE: APIDOC
CODE:

```
PasswordInput:
  Props:
    isDisabled: boolean
      Default: false
      Description: When disabled, user input is ignored.

    placeholder: string
      Description: Text to display when input is empty.

    onChange: Function
      Parameters:
        value: string
          Description: Input value.
      Description: Callback when input value changes.

    onSubmit: Function
      Parameters:
        value: string
          Description: Input value.
      Description: Callback when enter is pressed.
```

---

TITLE: EmailInput Props
DESCRIPTION: Documentation for the props available for the EmailInput component.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/email-input.md#_snippet_5

LANGUAGE: APIDOC
CODE:

```
EmailInput Props:

- isDisabled: boolean
  - Default: false
  - Description: When disabled, user input is ignored.

- placeholder: string
  - Description: Text to display when input is empty.

- defaultValue: string
  - Description: Default input value.

- domains: string[]
  - Default: ["aol.com", "gmail.com", "yahoo.com", "hotmail.com", "live.com", "outlook.com", "icloud.com", "hey.com"]
  - Description: Domains of email providers to autocomplete.

- onChange(value): Function
  - Parameters:
    - value: string
      - Description: Input value.
  - Description: Callback when input value changes.

- onSubmit(value): Function
  - Parameters:
    - value: string
      - Description: Input value.
  - Description: Callback when enter is pressed.
```

---

TITLE: Basic Password Input with onChange
DESCRIPTION: Demonstrates the fundamental usage of PasswordInput, where the input value is masked with asterisks and updated via the onChange prop as the user types.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/password-input.md#_snippet_0

LANGUAGE: tsx
CODE:

```
import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import {PasswordInput} from '@inkjs/ui';
import input from '../helpers/input.js';

function Example() {
	const [value, setValue] = useState('');

	return (
		<Box flexDirection="column" gap={1}>
			<PasswordInput placeholder="Enter password..." onChange={setValue} />
			<Text>Input value: "{value}"</Text>
		</Box>
	);
}

render(<Example />);
```

---

TITLE: EmailInput Submit on Enter
DESCRIPTION: Demonstrates using the `onSubmit` prop to capture the final input value when the user presses Enter.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/email-input.md#_snippet_3

LANGUAGE: tsx
CODE:

```
import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import {EmailInput} from '@inkjs/ui';

function Example() {
	const [value, setValue] = useState('');

	return (
		<Box flexDirection="column" gap={1}>
			<EmailInput placeholder="Enter email..." onSubmit={setValue} />
			<Text>Input value: "{value}"</Text>
		</Box>
	);
}

render(<Example />);
```

---

TITLE: EmailInput Autocomplete
DESCRIPTION: Illustrates the domain autocompletion feature of EmailInput, including customization via the `domains` prop.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/email-input.md#_snippet_2

LANGUAGE: tsx
CODE:

```
import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import {EmailInput} from '@inkjs/ui';

function Example() {
	const [value, setValue] = useState('');

	return (
		<Box flexDirection="column" gap={1}>
			<EmailInput
				placeholder="Enter email..."
			domains={['example.com', 'example.org']}
			onChange={setValue}
			/>

			<Text>Input value: "{value}"</Text>
		</Box>
	);
}

render(<Example />);
```

---

TITLE: Ink UI Alert Component API Documentation
DESCRIPTION: API reference for the Ink UI Alert component, detailing its available props, their types, and descriptions. This helps developers understand how to customize the appearance and content of alerts.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/alert.md#_snippet_1

LANGUAGE: APIDOC
CODE:

```
Alert Component API:

Props:
  children:
    Type: ReactNode
    Description: The main message content to display within the alert.
  variant:
    Type: 'info' | 'success' | 'error' | 'warning'
    Description: Specifies the visual style and color of the alert. Defaults to 'info'.
  title:
    Type: string
    Description: An optional title that appears above the main message content, providing context.
```

---

TITLE: UnorderedList Component API Documentation
DESCRIPTION: Details the props available for the UnorderedList and UnorderedList.Item components. This documentation covers the expected children and their types for building list structures.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/unordered-list.md#_snippet_1

LANGUAGE: APIDOC
CODE:

```
UnorderedList:
  Props:
    children: ReactNode
      Description: List items. Can contain UnorderedList.Item components or nested UnorderedList components.

UnorderedList.Item:
  Props:
    children: ReactNode
      Description: List item content. Can contain Text, Box, or other Ink components, including nested UnorderedList components.
```

---

TITLE: TextInput: Component Props and API Reference
DESCRIPTION: Provides a comprehensive reference for the props available for the TextInput component, detailing their types, default values, and functionality.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/text-input.md#_snippet_5

LANGUAGE: APIDOC
CODE:

```
TextInput Component Props:

- isDisabled: boolean
  - Default: false
  - Description: When disabled, user input is ignored.

- placeholder: string
  - Description: Text to display when input is empty.

- defaultValue: string
  - Description: Default input value.

- suggestions: string[]
  - Description: Suggestions to autocomplete the input value. Matching is case-sensitive.

- onChange(value): Function
  - Description: Callback when input value changes.
  - Parameters:
    - value: string - Input value.

- onSubmit(value): Function
  - Description: Callback when enter is pressed.
  - Parameters:
    - value: string - Input value.
```

---

TITLE: Ink.js UI OrderedList Component API
DESCRIPTION: API documentation for the `OrderedList` and `OrderedList.Item` components in Ink.js UI. It details the props available for customizing list rendering and content.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/ordered-list.md#_snippet_1

LANGUAGE: APIDOC
CODE:

```
OrderedList:
  Props:
    children: ReactNode
      Description: List items. Can contain `OrderedList.Item` components.

OrderedList.Item:
  Props:
    children: ReactNode
      Description: List item content. Can contain text or other Ink.js components, including nested `OrderedList`.
```

---

TITLE: EmailInput Default Value
DESCRIPTION: Shows how to set an initial value for the EmailInput component using the `defaultValue` prop.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/email-input.md#_snippet_1

LANGUAGE: tsx
CODE:

```
import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import {EmailInput} from '@inkjs/ui';

function Example() {
	const [value, setValue] = useState('');

	return (
		<Box flexDirection="column" gap={1}>
			<EmailInput
				placeholder="Enter email..."
				defaultValue={value}
				onChange={setValue}
			/>

			<Text>Input value: "{value}"</Text>
		</Box>
	);
}

render(<Example />);
```

---

TITLE: TextInput: Basic Usage with Ink.js
DESCRIPTION: Demonstrates the fundamental usage of the TextInput component for capturing single-line user input. It utilizes the `onChange` prop to update the application state as the user types.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/text-input.md#_snippet_0

LANGUAGE: tsx
CODE:

```
import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import {TextInput} from '@inkjs/ui';

function Example() {
	const [value, setValue] = useState('');

	return (
		<Box flexDirection="column" gap={1}>
			<TextInput placeholder="Start typing..." onChange={setValue} />
			<Text>Input value: "{value}"</Text>
		</Box>
	);
}

render(<Example />);
```

---

TITLE: UnorderedList Marker Configuration
DESCRIPTION: Illustrates how to include non-styling configuration within a component's theme. For `UnorderedList`, a `marker` configuration is provided as a function returning the character to be displayed before each list item.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/readme.md#_snippet_17

LANGUAGE: ts
CODE:

```
const theme = {
	config: () => ({
		marker: '─',
	}),
};
```

---

TITLE: Render Nested Ordered List with Ink.js
DESCRIPTION: Demonstrates how to use the `OrderedList` component from `@inkjs/ui` to render a nested list of items. It requires `ink` and `@inkjs/ui` as dependencies. The component accepts `OrderedList.Item` children, which can themselves contain nested `OrderedList` components.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/ordered-list.md#_snippet_0

LANGUAGE: tsx
CODE:

```
import React from 'react';
import {render, Box, Text} from 'ink';
import {OrderedList} from '@inkjs/ui';

function Example() {
	return (
		<OrderedList>
			<OrderedList.Item>
				<Text>Red</Text>
			</OrderedList.Item>

			<OrderedList.Item>
				<Text>Green</Text>

				<OrderedList>
					<OrderedList.Item>
						<Text>Light</Text>
					</OrderedList.Item>

					<OrderedList.Item>
						<Text>Dark</Text>
					</OrderedList.Item>
				</OrderedList>
			</OrderedList.Item>

			<OrderedList.Item>
				<Text>Blue</Text>
			</OrderedList.Item>
		</OrderedList>
	);
}

render(<Example />);
```

---

TITLE: TextInput: Setting Default Value with Ink.js
DESCRIPTION: Shows how to initialize the TextInput component with a predefined value using the `defaultValue` prop. This is useful for pre-filling forms or resuming input.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/text-input.md#_snippet_1

LANGUAGE: tsx
CODE:

```
import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import {TextInput} from '@inkjs/ui';

function Example() {
	const [value, setValue] = useState('Jane');

	return (
		<Box flexDirection="column" gap={1}>
			<TextInput
				placeholder="Start typing..."
				defaultValue={value}
				onChange={setValue}
			/>

			<Text>Input value: "{value}"</Text>
		</Box>
	);
}

render(<Example />);
```

---

TITLE: Ink MultiSelect Basic Usage
DESCRIPTION: Demonstrates the basic usage of the `MultiSelect` component. It's an uncontrolled component that allows users to select multiple options. The `onChange` prop is used to listen for value changes, and the selected values are displayed.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/multi-select.md#_snippet_0

LANGUAGE: tsx
CODE:

```
import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import {MultiSelect} from '@inkjs/ui';

function Example() {
	const [value, setValue] = useState<string[]>([]);

	return (
		<Box flexDirection="column" gap={1}>
			<MultiSelect
				options={[
					{
						label: 'Red',
						value: 'red',
					},
					{
						label: 'Green',
						value: 'green',
					},
					{
						label: 'Yellow',
						value: 'yellow',
					},
					{
						label: 'Blue',
						value: 'blue',
					},
					{
						label: 'Magenta',
						value: 'magenta',
					},
					{
						label: 'Cyan',
						value: 'cyan',
					},
					{
						label: 'White',
						value: 'white',
					},
				]}
				onChange={setValue}
			/>

			<Text>Selected values: {value.join(', ')}</Text>
		</Box>
	);
}

render(<Example />);
```

---

TITLE: Ink UI Select Default Value Configuration
DESCRIPTION: Illustrates how to set an initial selected option for the Select component using the `defaultValue` prop. This pre-selects an item when the component first renders.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/select.md#_snippet_1

LANGUAGE: tsx
CODE:

```
import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import {Select} from '@inkjs/ui';

function Example() {
	const [value, setValue] = useState('green');

	return (
		<Box padding={2} flexDirection="column" gap={1}>
			<Select
				defaultValue={value}
				options={[
					{
						label: 'Red',
						value: 'red',
					},
					{
						label: 'Green',
						value: 'green',
					},
					{
						label: 'Yellow',
						value: 'yellow',
					},
					{
						label: 'Blue',
						value: 'blue',
					},
					{
						label: 'Magenta',
						value: 'magenta',
					},
					{
						label: 'Cyan',
						value: 'cyan',
					},
					{
						label: 'White',
						value: 'white',
					},
				]}
				onChange={setValue}
			/>

			<Text>Selected value: {value}</Text>
		</Box>
	);
}

render(<Example />);
```

---

TITLE: Password Input with onSubmit
DESCRIPTION: Shows how to use the onSubmit prop to capture the input value only when the user presses the Enter key, useful for form submissions.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/password-input.md#_snippet_1

LANGUAGE: tsx
CODE:

```
import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import {PasswordInput} from '@inkjs/ui';

function Example() {
	const [value, setValue] = useState('');

	return (
		<Box flexDirection="column" gap={1}>
			<PasswordInput placeholder="Enter password..." onSubmit={setValue} />
			<Text>Input value: "{value}"</Text>
		</Box>
	);
}

render(<Example />);
```

---

TITLE: Use useComponentTheme for Custom Components
DESCRIPTION: Demonstrates how to access and apply theme styles for a custom component within Ink UI. It uses the `useComponentTheme` hook to retrieve styles for 'CustomLabel' and applies them to a `Text` component.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/readme.md#_snippet_18

LANGUAGE: tsx
CODE:

```
import React, {render, Text, type TextProps} from 'ink';
import {
	ThemeProvider,
	defaultTheme,
	extendTheme,
	useComponentTheme,
	type ComponentTheme,
} from '@inkjs/ui';

const customLabelTheme = {
	styles: {
		label: (): TextProps => ({
			color: 'green',
		}),
	},
} satisfies ComponentTheme;

type CustomLabelTheme = typeof customLabelTheme;

const customTheme = extendTheme(defaultTheme, {
	components: {
		CustomLabel: customLabelTheme,
	},
});

function CustomLabel() {
	const {styles} = useComponentTheme<CustomLabelTheme>('CustomLabel');

	return <Text {...styles.label()}>Hello world</Text>;
}

function Example() {
	return (
		<ThemeProvider theme={customTheme}>
			<CustomLabel />
		</ThemeProvider>
	);
}

render(<Example />);
```

---

TITLE: Spinner Component Props
DESCRIPTION: Details the available props for the Spinner component, including their types and descriptions.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/spinner.md#_snippet_1

LANGUAGE: APIDOC
CODE:

```
Spinner:
  Props:
    label: string
      - Label to show next to the spinner.
```

---

TITLE: ProgressBar Component API: value Prop
DESCRIPTION: Defines the `value` prop for the ProgressBar component. This prop accepts a number between 0 and 100, representing the current progress, with a default value of 0.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/progress-bar.md#_snippet_1

LANGUAGE: APIDOC
CODE:

```
ProgressBar Component API: value Prop

value: number
  Type: number
  Constraints: Minimum: 0, Maximum: 100
  Default: 0
  Description: Progress.
```

---

TITLE: Customize Spinner Theme with extendTheme
DESCRIPTION: Demonstrates how to customize the default Ink UI theme, specifically changing the Spinner's frame color. It uses `extendTheme` to merge custom styles with the `defaultTheme` and applies the custom theme via `ThemeProvider`.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/readme.md#_snippet_15

LANGUAGE: tsx
CODE:

```
import {render, type TextProps} from 'ink';
import {Spinner, ThemeProvider, extendTheme, defaultTheme} from '@inkjs/ui';

const customTheme = extendTheme(defaultTheme, {
	components: {
		Spinner: {
			styles: {
				frame: (): TextProps => ({
					color: 'magenta',
				}),
			},
		},
	},
});

function Example() {
	return (
		<ThemeProvider theme={customTheme}>
			<Spinner label="Loading" />
		</ThemeProvider>
	);
}

render(<Example />);
```

---

TITLE: Spinner Default Theme Structure
DESCRIPTION: Defines the default styling structure for the Ink UI Spinner component. It specifies styles for the container, frame, and label, returning `BoxProps` and `TextProps` respectively. This serves as a blueprint for customization.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/readme.md#_snippet_14

LANGUAGE: tsx
CODE:

```
const theme = {
	styles: {
		container: (): BoxProps => ({
			gap: 1,
		}),
		frame: (): TextProps => ({
			color: 'blue',
		}),
		label: (): TextProps => ({}),
	},
} satisfies ComponentTheme;
```

---

TITLE: Ink MultiSelect Default Value
DESCRIPTION: Shows how to set an initial selection for the `MultiSelect` component using the `defaultValue` prop. This pre-populates the component with specified options.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/multi-select.md#_snippet_1

LANGUAGE: tsx
CODE:

```
import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import {MultiSelect} from '@inkjs/ui';

function Example() {
	const [value, setValue] = useState(['green']);

	return (
		<Box flexDirection="column" gap={1}>
			<MultiSelect
				defaultValue={value}
				options={[
					{
						label: 'Red',
						value: 'red',
					},
					{
						label: 'Green',
						value: 'green',
					},
					{
						label: 'Yellow',
						value: 'yellow',
					},
					{
						label: 'Blue',
						value: 'blue',
					},
					{
						label: 'Magenta',
						value: 'magenta',
					},
					{
						label: 'Cyan',
						value: 'cyan',
					},
					{
						label: 'White',
						value: 'white',
					},
				]}
				onChange={setValue}
			/>

			<Text>Selected values: {value.join(', ')}</Text>
		</Box>
	);
}

render(<Example />);
```

---

TITLE: Creating Nested Ordered Lists with @inkjs/ui
DESCRIPTION: The OrderedList component is used to display numbered lists of items. Similar to UnorderedList, it supports nesting to create hierarchical structures with sub-lists.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/readme.md#_snippet_13

LANGUAGE: jsx
CODE:

```
import {OrderedList} from '@inkjs/ui';
import {Text} from '@inkjs/ui';

<OrderedList>
	<OrderedList.Item>
		<Text>Red</Text>
	</OrderedList.Item>

	<OrderedList.Item>
		<Text>Green</Text>

		<OrderedList>
			<OrderedList.Item>
				<Text>Light</Text>
			</OrderedList.Item>

			<OrderedList.Item>
				<Text>Dark</Text>
			</OrderedList.Item>
		</OrderedList>
	</OrderedList.Item>

	<OrderedList.Item>
		<Text>Blue</Text>
	</OrderedList.Item>
</OrderedList>
```

---

TITLE: Ink MultiSelect Submit on Enter
DESCRIPTION: Demonstrates using the `onSubmit` prop instead of `onChange`. This prop is triggered only when the user presses the Enter key, capturing the final selected value at that moment.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/multi-select.md#_snippet_2

LANGUAGE: tsx
CODE:

```
import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import {MultiSelect} from '@inkjs/ui';

function Example() {
	const [value, setValue] = useState<string[]>([]);

	return (
		<Box flexDirection="column" gap={1}>
			<MultiSelect
				options={[
					{
						label: 'Red',
						value: 'red',
					},
					{
						label: 'Green',
						value: 'green',
					},
					{
						label: 'Yellow',
						value: 'yellow',
					},
					{
						label: 'Blue',
						value: 'blue',
					},
					{
						label: 'Magenta',
						value: 'magenta',
					},
					{
						label: 'Cyan',
						value: 'cyan',
					},
					{
						label: 'White',
						value: 'white',
					},
				]}
				onSubmit={setValue}
			/>

			<Text>Selected values: {value.join(', ')}</Text>
		</Box>
	);
}

render(<Example />);
```

---

TITLE: TextInput: Submit on Enter with Ink.js
DESCRIPTION: Demonstrates using the `onSubmit` prop to capture the input value only when the user presses the Enter key. This is an alternative to `onChange` for scenarios where intermediate input changes are not needed.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/text-input.md#_snippet_3

LANGUAGE: tsx
CODE:

```
import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import {TextInput} from '@inkjs/ui';

function Example() {
	const [value, setValue] = useState('');

	return (
		<Box flexDirection="column" gap={1}>
			<TextInput placeholder="Start typing..." onSubmit={setValue} />
			<Text>Input value: "{value}"</Text>
		</Box>
	);
}

render(<Example />);
```

---

TITLE: TextInput: Autocomplete Suggestions with Ink.js
DESCRIPTION: Illustrates the autocomplete feature of TextInput, where it suggests values from a provided array based on user input. Matching is case-sensitive, and pressing Enter accepts the current suggestion.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/text-input.md#_snippet_2

LANGUAGE: tsx
CODE:

```
import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import {TextInput} from '@inkjs/ui';

function Example() {
	const [value, setValue] = useState('');

	return (
		<Box flexDirection="column" gap={1}>
			<TextInput
				placeholder="Start typing..."
			suggestions={['Abby', 'Angel', 'Annie']}
			onChange={setValue}
			/>

			<Text>Input value: "{value}"</Text>
		</Box>
	);
}

render(<Example />);
```

---

TITLE: StatusMessage Icon Styling by Variant
DESCRIPTION: Shows how to define conditional styling for a component's icon based on its `variant` prop. The `icon` style function dynamically selects a color ('green', 'red', 'yellow', 'blue') from a mapping.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/readme.md#_snippet_16

LANGUAGE: ts
CODE:

```
const colorByVariant = {
	success: 'green',
	error: 'red',
	warning: 'yellow',
	info: 'blue',
};

const theme = {
	styles: {
		icon: ({variant}) => ({
			color: colorByVariant[variant],
		}),
	},
};
```

---

TITLE: Displaying Alerts with @inkjs/ui
DESCRIPTION: The Alert component is used to draw the user's attention to important messages. It supports different variants like 'success', 'error', 'warning', and 'info' to convey specific types of information.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/readme.md#_snippet_11

LANGUAGE: jsx
CODE:

```
import {Alert} from '@inkjs/ui';

<Alert variant="success">
    A new version of this CLI is available
</Alert>

<Alert variant="error">
    Your license is expired
</Alert>

<Alert variant="warning">
    Current version of this CLI has been deprecated
</Alert>

<Alert variant="info">
    API won't be available tomorrow night
</Alert>
```

---

TITLE: Creating Nested Unordered Lists with @inkjs/ui
DESCRIPTION: The UnorderedList component is used to display lists of items. It supports nesting to create hierarchical structures, allowing for sub-lists within list items.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/readme.md#_snippet_12

LANGUAGE: jsx
CODE:

```
import {UnorderedList} from '@inkjs/ui';
import {Text} from '@inkjs/ui';

<UnorderedList>
	<UnorderedList.Item>
		<Text>Red</Text>
	</UnorderedList.Item>

	<UnorderedList.Item>
		<Text>Green</Text>

		<UnorderedList>
			<UnorderedList.Item>
				<Text>Light</Text>
			</UnorderedList.Item>

			<UnorderedList.Item>
				<Text>Dark</Text>
			</UnorderedList.Item>
		</UnorderedList>
	</UnorderedList.Item>

	<UnorderedList.Item>
		<Text>Blue</Text>
	</UnorderedList.Item>
</UnorderedList>
```

---

TITLE: Ink UI Select Disabled State Management
DESCRIPTION: Demonstrates how to manage the disabled state of multiple Select components. The `isDisabled` prop prevents user interaction, allowing only one component to be active at a time.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/select.md#_snippet_2

LANGUAGE: tsx
CODE:

```
import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import {Select} from '@inkjs/ui';

const options = [
	{
		label: 'Red',
		value: 'red',
	},
	{
		label: 'Green',
		value: 'green',
	},
	{
		label: 'Yellow',
		value: 'yellow',
	},
	{
		label: 'Blue',
		value: 'blue',
	},
	{
		label: 'Magenta',
		value: 'magenta',
	},
	{
		label: 'Cyan',
		value: 'cyan',
	},
	{
		label: 'White',
		value: 'white',
	},
];

function Example() {
	const [activeInput, setActiveInput] = useState('primary');
	const [primaryColor, setPrimaryColor] = useState<string | undefined>();
	const [secondaryColor, setSecondaryColor] = useState<string | undefined>();

	return (
		<Box>
			<Box flexDirection="column" gap={1} width={28}>
				<Select
					isDisabled={activeInput !== 'primary'}
					options={options}
					onChange={value => {
						setPrimaryColor(value);
						setActiveInput('secondary');
					}}
				/>

				<Text>Primary color: {primaryColor}</Text>
			</Box>

			<Box flexDirection="column" gap={1} width={28}>
				<Select
					isDisabled={activeInput !== 'secondary'}
					options={options}
					onChange={value => {
						setSecondaryColor(value);
						setActiveInput('none');
					}}
				/>

				<Text>Secondary color: {secondaryColor}</Text>
			</Box>
		</Box>
	);
}

render(<Example />);
```

---

TITLE: Disabled Password Input
DESCRIPTION: Illustrates managing multiple PasswordInput components, enabling only one to receive user input at a time using the isDisabled prop.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/password-input.md#_snippet_2

LANGUAGE: tsx
CODE:

```
import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import {PasswordInput} from '@inkjs/ui';
import input from '../helpers/input.js';
import press from '../helpers/press.js';

function Example() {
	const [activeInput, setActiveInput] = useState('password');
	const [password, setPassword] = useState('');
	const [passwordConfirmation, setPasswordConfirmation] = useState('');

	return (
		<Box padding={2} flexDirection="column" gap={1}>
			<Box flexDirection="column">
				<PasswordInput
					isDisabled={activeInput !== 'password'}
					placeholder="Enter password..."
					onChange={setPassword}
					onSubmit={() => {
						setActiveInput('passwordConfirmation');
					}}
				/>

				<PasswordInput
					isDisabled={activeInput !== 'passwordConfirmation'}
					placeholder="Confirm password..."
					onChange={setPasswordConfirmation}
					onSubmit={() => {
						setActiveInput('none');
					}}
				/>
			</Box>

			<Box flexDirection="column">
				<Text>Password: "{password}"</Text>
				<Text>Password confirmation: "{passwordConfirmation}"</Text>
			</Box>
		</Box>
	);
}

render(<Example />);
```

---

TITLE: EmailInput Disabled State
DESCRIPTION: Shows how to manage the disabled state of EmailInput components, useful when multiple inputs are present.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/email-input.md#_snippet_4

LANGUAGE: tsx
CODE:

```
import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import {EmailInput} from '@inkjs/ui';

function Example() {
	const [activeInput, setActiveInput] = useState('first');
	const [first, setFirst] = useState('');
	const [second, setSecond] = useState('');

	return (
		<Box flexDirection="column" gap={1}>
			<Box flexDirection="column">
				<EmailInput
					isDisabled={activeInput !== 'first'}
					placeholder="Enter first email..."
					onChange={setFirst}
					onSubmit={() => {
						setActiveInput('second');
					}}
				/>

				<EmailInput
					isDisabled={activeInput !== 'second'}
					placeholder="Enter second email..."
					onChange={setSecond}
					onSubmit={() => {
						setActiveInput('none');
					}}
				/>
			</Box>

			<Box flexDirection="column">
				<Text>First email: "{first}"</Text>
				<Text>Second email: "{second}"</Text>
			</Box>
		</Box>
	);
}

render(<Example />);
```

---

TITLE: TextInput: Disabling Inputs with Ink.js
DESCRIPTION: Explains how to disable a TextInput component using the `isDisabled` prop. This is crucial when managing focus and input for multiple interactive elements in the UI.

SOURCE: https://github.com/vadimdemedes/ink-ui/blob/main/docs/text-input.md#_snippet_4

LANGUAGE: tsx
CODE:

```
import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import {TextInput} from '@inkjs/ui';

function Example() {
	const [activeInput, setActiveInput] = useState('name');
	const [name, setName] = useState('');
	const [surname, setSurname] = useState('');

	return (
		<Box flexDirection="column" gap={1}>
			<Box flexDirection="column">
				<TextInput
					isDisabled={activeInput !== 'name'}
					placeholder="Enter your name..."
					onChange={setName}
					onSubmit={() => {
						setActiveInput('surname');
					}}
				/>

				<TextInput
					isDisabled={activeInput !== 'surname'}
					placeholder="Enter your surname..."
					onChange={setSurname}
					onSubmit={() => {
						setActiveInput('none');
					}}
				/>
			</Box>

			<Box flexDirection="column">
				<Text>Name: "{name}"</Text>
				<Text>Surname: "{surname}"</Text>
			</Box>
		</Box>
	);
}

render(<Example />);
```
