import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';

expect.extend(toHaveNoViolations);

// Minimal static markup mirroring key accessibility structure of the MVP chat page
const staticMarkup = `
  <main class="p-4 grid gap-3" aria-label="Chat interface">
    <header class="flex items-center gap-2">
      <h1 class="text-xl">Chat</h1>
      <label class="sr-only" for="model">Model</label>
      <select id="model" aria-label="Select model">
        <option value="gpt-4o">GPT-4o</option>
      </select>
    </header>
    <section class="grid md:grid-cols-[2fr_1fr] gap-3" aria-label="Conversation and tools">
      <div class="border rounded p-2 min-h-64" aria-live="polite" aria-relevant="additions text" aria-busy="false">
        <ul>
          <li class="my-2">
            <div class="text-xs text-gray-500">assistant</div>
            <div class="whitespace-pre-wrap">Hello</div>
          </li>
        </ul>
        <output class="text-sm text-gray-500" aria-live="polite">Streaming…</output>
      </div>
      <section class="border rounded p-2" aria-labelledby="tool-calls-heading">
        <h2 id="tool-calls-heading" class="text-sm font-semibold">Tool activity</h2>
        <p class="text-xs text-gray-500">No tools used yet.</p>
      </section>
    </section>
    <form aria-label="Message composer">
      <label for="composer" class="sr-only">Message</label>
      <textarea id="composer"></textarea>
      <button type="submit" aria-disabled="false">Send</button>
    </form>
  </main>
`;

describe('MVP Chat a11y (static smoke)', () => {
  it('has no axe violations on core structure', async () => {
    const dom = document.createElement('div');
    dom.innerHTML = staticMarkup;
    const results = await axe(dom);
    expect(results).toHaveNoViolations();
  });
});
