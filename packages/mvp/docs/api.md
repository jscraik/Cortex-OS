# API Reference

## `createValidator(schema)`
Returns an object with a `validate(value)` method that throws a `ZodError` (from the [Zod](https://github.com/colinhacks/zod) library) on schema violations.

**Example of error handling:**

```js
import { z, ZodError } from "zod";
import { createValidator } from "your-library";

const schema = z.object({ name: z.string() });
const validator = createValidator(schema);

try {
  validator.validate({ name: 123 }); // Invalid: name should be a string
} catch (err) {
  if (err instanceof ZodError) {
    console.error("Validation failed:", err.errors);
  } else {
    throw err; // rethrow unexpected errors
  }
}
## `generateId()`
Generates a collision-resistant string identifier using nanoid.

## `FileManager`
Class with asynchronous `glob(pattern)` for matching files on disk.
