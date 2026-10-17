import type { BrowserContext, Page } from 'playwright';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { type Harness, startHarness } from '../src/harness.js';

let harness: Harness;
const contexts: BrowserContext[] = [];

beforeAll(async () => {
  harness = await startHarness();
});

afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => context.close()));
});

afterAll(async () => {
  await harness.close();
});

const twoPageSchema = {
  'x-chat-version': '1',
  'x-chat-pages': [
    {
      id: 'p1',
      title: 'P1',
      questions: [
        { id: 'q1', type: 'string', 'x-chat-input': 'radio', title: 'Pick?', enum: ['A', 'B'] },
      ],
      branching: [
        { type: 'if', form_element: 'q1', value: 'A', destination_id: 'p2' },
        { type: 'always', destination_id: '**FORM_COMPLETED**' },
      ],
    },
    {
      id: 'p2',
      title: 'P2',
      questions: [{ id: 'q2', type: 'string', 'x-chat-input': 'text', title: 'Tell us more' }],
      branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
    },
  ],
};

/** Two tabs of one browser: they share localStorage and get real `storage` events. */
async function openTwoTabs(): Promise<{ thisTab: Page; otherTab: Page }> {
  const context = await harness.newContext();
  contexts.push(context);
  const thisTab = await context.newPage();
  const otherTab = await context.newPage();
  await thisTab.goto(`${harness.baseUrl}/`);
  await otherTab.goto(`${harness.baseUrl}/`);
  return { thisTab, otherTab };
}

async function mountForm(page: Page): Promise<void> {
  await page.evaluate((schemaText) => {
    const form = document.createElement('chat-form');
    form.setAttribute('schema', schemaText);
    form.setAttribute('storage-key', 'tabs');
    document.body.appendChild(form);
    // Keep what the form tells the page, for the test to read.
    const heard = window as unknown as {
      externalChanges: unknown[];
      staleSubmits: unknown[];
      completions: unknown[];
    };
    heard.staleSubmits = [];
    heard.completions = [];
    form.addEventListener('chat-stale-submit', (event) => {
      heard.staleSubmits.push((event as CustomEvent).detail);
    });
    form.addEventListener('chat-form-complete', (event) => {
      heard.completions.push((event as CustomEvent).detail);
    });
    (window as unknown as { externalChanges: unknown[] }).externalChanges = [];
    form.addEventListener('chat-external-change', (event) => {
      (window as unknown as { externalChanges: unknown[] }).externalChanges.push(
        (event as CustomEvent).detail,
      );
    });
  }, JSON.stringify(twoPageSchema));
  await page.waitForFunction(() =>
    document.querySelector('chat-form')?.shadowRoot?.textContent?.includes('Pick?'),
  );
}

const shownText = (page: Page): Promise<string> =>
  page.evaluate(() => document.querySelector('chat-form')?.shadowRoot?.textContent ?? '');

describe('<chat-form> with the same form open in two tabs', () => {
  it('tells this tab when the other tab moves on, and follows it after resync()', async () => {
    const { thisTab, otherTab } = await openTwoTabs();
    await mountForm(thisTab);
    await mountForm(otherTab);

    await otherTab.locator('chat-form input[type="radio"]').first().check();
    await otherTab.locator('chat-form [part="submit-btn"]').click();
    await otherTab.waitForFunction(() =>
      document.querySelector('chat-form')?.shadowRoot?.textContent?.includes('Tell us more'),
    );

    await thisTab.waitForFunction(
      () => (window as unknown as { externalChanges: unknown[] }).externalChanges.length > 0,
    );
    const changes = await thisTab.evaluate(
      () =>
        (window as unknown as { externalChanges: { progress: { currentPageId: string } | null }[] })
          .externalChanges,
    );
    expect(changes.at(-1)?.progress?.currentPageId).toBe('p2');
    // The form on screen is not moved by the change itself.
    expect(await shownText(thisTab)).toContain('Pick?');

    const restarted = await thisTab.evaluate(() =>
      (document.querySelector('chat-form') as unknown as { resync(): Promise<boolean> }).resync(),
    );
    expect(restarted).toBe(true);
    const text = await shownText(thisTab);
    expect(text).toContain('Tell us more');
    expect(text).not.toContain('Pick?');
  });

  it('reports null when the other tab cleared the progress', async () => {
    const { thisTab, otherTab } = await openTwoTabs();
    await mountForm(thisTab);
    await mountForm(otherTab);
    await otherTab.locator('chat-form input[type="radio"]').first().check();
    await otherTab.locator('chat-form [part="submit-btn"]').click();
    await thisTab.waitForFunction(
      () => (window as unknown as { externalChanges: unknown[] }).externalChanges.length > 0,
    );

    await otherTab.evaluate(() =>
      (
        document.querySelector('chat-form') as unknown as { clearProgress(): boolean }
      ).clearProgress(),
    );
    await thisTab.waitForFunction(() => {
      const changes = (window as unknown as { externalChanges: { progress: unknown }[] })
        .externalChanges;
      return changes.at(-1)?.progress === null;
    });
  });

  it('does not let a tab that is behind overwrite the newer progress', async () => {
    const { thisTab, otherTab } = await openTwoTabs();
    await mountForm(thisTab);
    await mountForm(otherTab);
    await otherTab.locator('chat-form input[type="radio"]').first().check();
    await otherTab.locator('chat-form [part="submit-btn"]').click();
    await thisTab.waitForFunction(
      () => (window as unknown as { externalChanges: unknown[] }).externalChanges.length > 0,
    );

    // "B" would finish the form here and wipe the other tab's progress.
    await thisTab.locator('chat-form input[type="radio"]').nth(1).check();
    await thisTab.locator('chat-form [part="submit-btn"]').click();

    await thisTab.waitForFunction(() =>
      document.querySelector('chat-form')?.shadowRoot?.textContent?.includes('Tell us more'),
    );
    const heard = await thisTab.evaluate(() => {
      const window_ = window as unknown as { staleSubmits: unknown[]; completions: unknown[] };
      return { stale: window_.staleSubmits.length, completions: window_.completions.length };
    });
    expect(heard).toEqual({ stale: 1, completions: 0 });
  });

  it('shows the finished form, and sends nothing again, when the other tab finished it', async () => {
    const { thisTab, otherTab } = await openTwoTabs();
    await mountForm(thisTab);
    await mountForm(otherTab);
    await otherTab.locator('chat-form input[type="radio"]').first().check();
    await otherTab.locator('chat-form [part="submit-btn"]').click();
    await otherTab.waitForFunction(() =>
      document.querySelector('chat-form')?.shadowRoot?.textContent?.includes('Tell us more'),
    );
    await otherTab.locator('chat-form input[type="text"]').fill('done');
    await otherTab.locator('chat-form [part="submit-btn"]').click();
    await otherTab.waitForFunction(
      () => (window as unknown as { completions: unknown[] }).completions.length === 1,
    );

    // This tab never saw the form move on, and still shows the first page.
    await thisTab.locator('chat-form input[type="radio"]').nth(1).check();
    await thisTab.locator('chat-form [part="submit-btn"]').click();

    const heard = await thisTab.evaluate(() => {
      const window_ = window as unknown as {
        staleSubmits: { completed: boolean }[];
        completions: unknown[];
      };
      return {
        stale: window_.staleSubmits.map((detail) => detail.completed),
        completions: window_.completions.length,
        submitButton: Boolean(
          document.querySelector('chat-form')?.shadowRoot?.querySelector('[part="submit-btn"]'),
        ),
      };
    });
    expect(heard).toEqual({ stale: [true], completions: 0, submitButton: false });
  });
});
