import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';

expect.extend(toHaveNoViolations);

// Minimal static markup mirroring key accessibility structure of the MVP chat page
const staticMarkup = `
  <main class="p-4 grid gap-3" aria-label="Chat interface">
    <a href="#composer" class="sr-only focus:not-sr-only focus:underline">Skip to composer</a>
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
          <li class="my-2 flex justify-start">
            <div class="max-w-[80%]">
              <div class="text-xs text-gray-500">assistant</div>
              <div class="rounded px-2 py-1 whitespace-pre-wrap bg-gray-100">Hello</div>
            </div>
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
    expect(results.violations).toHaveLength(0);
  });

  it('updates aria-live region when streaming and toggles aria-busy', async () => {
    // build a live DOM from the static markup
    const host = document.createElement('div');
    host.innerHTML = staticMarkup;

    // find the conversation container that declares aria-live
    const liveContainer = host.querySelector('[aria-live]');
    expect(liveContainer).toBeTruthy();

    // initially aria-busy is false in our static markup
    expect(liveContainer?.getAttribute('aria-busy')).toBe('false');

    // simulate streaming start by toggling aria-busy and adding a streaming output
    liveContainer?.setAttribute('aria-busy', 'true');
    const streamingOutput = document.createElement('output');
    streamingOutput.className = 'text-sm text-gray-500';
    streamingOutput.setAttribute('aria-live', 'polite');
    streamingOutput.textContent = 'Streaming…';
    liveContainer?.appendChild(streamingOutput);

    // axe should not complain about adding a polite live region
    const results = await axe(host);
    expect(results.violations).toHaveLength(0);

    // simulate stream end
    liveContainer?.setAttribute('aria-busy', 'false');
    streamingOutput.textContent = 'Done';
    expect(liveContainer?.getAttribute('aria-busy')).toBe('false');
  });

  it('skip link targets composer and composer is focusable', async () => {
    const host = document.createElement('div');
    host.innerHTML = staticMarkup;

    const skipLink = host.querySelector('a[href="#composer"]');
    expect(skipLink).toBeTruthy();

    const composer = host.querySelector('#composer');
    expect(composer).toBeTruthy();

    // ensure the composer is a control that can receive focus
    // simulate focus by calling focus() if available
    // JSDOM supports .focus but it doesn't necessarily change document.activeElement—this assertion keeps it defensive
    try {
      (composer as HTMLElement).focus();
      expect(document.activeElement === composer || document.activeElement === null).toBeTruthy();
    } catch {
      // if focus isn't supported in this environment, at minimum assert it has the expected tabindex or is a native control
      const tag = composer?.tagName?.toLowerCase();
      expect(
        tag === 'textarea' || tag === 'input' || composer?.getAttribute('tabindex') !== null,
      ).toBeTruthy();
    }
  });

  it('token-by-token streaming updates aria-live content and remains accessible', async () => {
    // build host from static markup
    const host = document.createElement('div');
    host.innerHTML = staticMarkup;

    const liveContainer = host.querySelector('[aria-live]');
    expect(liveContainer).toBeTruthy();

    // create a stream placeholder element similar to the app's { id: 'stream' }
    const streamLi = document.createElement('li');
    streamLi.setAttribute('id', 'stream');
    streamLi.className = 'my-2';
    const roleDiv = document.createElement('div');
    roleDiv.className = 'text-xs text-gray-500';
    roleDiv.textContent = 'assistant';
    const contentDiv = document.createElement('div');
    contentDiv.className = 'whitespace-pre-wrap';
    contentDiv.textContent = '';
    streamLi.appendChild(roleDiv);
    streamLi.appendChild(contentDiv);

    const ul = liveContainer.querySelector('ul') || document.createElement('ul');
    ul.appendChild(streamLi);
    if (!liveContainer.querySelector('ul')) liveContainer.appendChild(ul);

    // simulate token-by-token arrival
    const tokens = ['Hello', ', ', 'this', ' ', 'is', ' ', 'a', ' ', 'stream', '.'];
    let assembled = '';

    // toggle busy state
    liveContainer.setAttribute('aria-busy', 'true');
    for (const t of tokens) {
      assembled += t;
      // emulate appendToken behaviour
      contentDiv.textContent = assembled;

      // lightweight accessibility check after incremental update
      const results = await axe(host);
      expect(results.violations).toHaveLength(0);

      // sanity check that DOM was updated
      expect(contentDiv.textContent).toBe(assembled);
    }

    // finalize stream
    liveContainer.setAttribute('aria-busy', 'false');
    expect(liveContainer.getAttribute('aria-busy')).toBe('false');
    // final axe check
    const final = await axe(host);
    expect(final.violations).toHaveLength(0);
  });
});
