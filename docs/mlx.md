# MLX Helpers

Utilities built on Apple's [MLX](https://github.com/ml-explore/mlx) library.

## Installation

No additional Node dependencies are required for the default Python-backed
helpers. If you're on macOS and want to experiment with the native MLX bindings,
install `@frost-beta/clip` manually in your own environment. The repository no
longer installs it automatically because its native dependency
(`@frost-beta/mlx`) only ships binaries for macOS/Windows and fails on Linux.

## Usage

```ts
import { generateEmbedding, rerankDocuments } from '@frost-beta/clip';

const vectors = await generateEmbedding(['hello', 'world']);
const scores = await rerankDocuments('hello', ['hello world', 'hi there']);
```

## Accessibility Notes

- Functions accept plain string inputs, supporting screen reader and keyboard-based workflows.
- Provide meaningful alternative text when embedding content derived from non-text sources to maintain context for assistive technologies.
