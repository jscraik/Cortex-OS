# Sanitizer Test Corpus

This fixture contains known problematic patterns for testing sanitizer behavior.

## Code Fence Issues

### Malformed TypeScript fence

```typescript
export interface Config<T> {
  value: T;
}
```

### Spurious early closing fence in mermaid

```mermaid
graph TD
  A --> B
  ```

  This content should be part of the mermaid block

```

### Mismatched double/triple backticks
``javascript
const config = { api: "v1" };
```

### Plain fence that needs normalization

`
const simple = true;
`

## Generic Type Issues

Inline generics outside code: Promise<string> and Array<number> should be escaped.

Multi-line generic:
interface Complex<
  T extends string,
  U = number
> {
  data: T;
}

## Pseudo-JSX Issues

Fragments like <> and </> should be escaped.
Self-closing tags like <Input /> should be handled.

## HTML Tag Issues

Raw <div> tags outside code blocks.
<span>Inline spans</span> should be escaped.

## Mixed Issues

Here's a complex case with TypeScript<T> generics and <Fragment> tags:

```typescript
// This should stay as-is
interface API<T> {
  data: T;
}
```

But this Promise<void> should be escaped, along with <MyComponent />.
