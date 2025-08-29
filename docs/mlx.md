# MLX Helpers

Utilities built on Apple's [MLX](https://github.com/ml-explore/mlx) library.

## Installation

```bash
pnpm add @frost-beta/clip
```

## Usage

```ts
import { embed, rerank } from '../src/lib/mlx';

const vectors = await embed(['hello', 'world']);
const scores = await rerank('hello', ['hello world', 'hi there']);
```

## Accessibility Notes

- Functions accept plain string inputs, supporting screen reader and keyboard-based workflows.
- Provide meaningful alternative text when embedding content derived from non-text sources to maintain context for assistive technologies.
