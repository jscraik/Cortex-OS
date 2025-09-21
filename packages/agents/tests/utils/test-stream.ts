/**
 * Utility for creating memory-based writable streams for testing
 */

export interface MemoryStreamOptions {
  encoding?: BufferEncoding;
  highWaterMark?: number;
}

/**
 * Creates a writable stream that captures all data in memory
 * @param onData Callback function that receives each chunk of data
 * @param options Stream options
 * @returns A WritableStream instance
 */
export function createMemoryWritableStream(
  onData: (data: string) => void,
  options: MemoryStreamOptions = {}
): WritableStream<Uint8Array> {
  const { encoding = 'utf-8', highWaterMark = 16 * 1024 } = options;

  return new WritableStream({
    highWaterMark,
    async write(chunk, controller) {
      try {
        const text = new TextDecoder(encoding).decode(chunk);
        onData(text);
      } catch (error) {
        controller.error(error);
        throw error;
      }
    },
    close() {
      // No-op for memory stream
    },
    abort(reason) {
      console.error('Memory stream aborted:', reason);
    },
  });
}

/**
 * Creates a readable stream from an array of chunks
 * @param chunks Array of data chunks to read
 * @param options Stream options
 * @returns A ReadableStream instance
 */
export function createMemoryReadableStream(
  chunks: Uint8Array[],
  options: MemoryStreamOptions = {}
): ReadableStream<Uint8Array> {
  const { highWaterMark = 16 * 1024 } = options;
  let index = 0;

  return new ReadableStream({
    highWaterMark,
    async pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(chunks[index++]);
      } else {
        controller.close();
      }
    },
    cancel() {
      // No-op for memory stream
    },
  });
}

/**
 * Creates a duplex stream that can both read and write from memory
 * @param onData Callback for written data
 * @param chunks Array of data to read
 * @param options Stream options
 * @returns A duplex stream instance
 */
export function createMemoryDuplexStream(
  onData: (data: string) => void,
  chunks: Uint8Array[] = [],
  options: MemoryStreamOptions = {}
): TransformStream<Uint8Array, Uint8Array> {
  let readIndex = 0;

  return new TransformStream({
    async transform(chunk, controller) {
      // Echo written chunks back as readable data
      onData(new TextDecoder().decode(chunk));
      controller.enqueue(chunk);
    },
    async flush(controller) {
      // Write any remaining chunks
      while (readIndex < chunks.length) {
        controller.enqueue(chunks[readIndex++]);
      }
    },
  });
}