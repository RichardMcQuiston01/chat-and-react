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

async function openPage(): Promise<{ context: BrowserContext; page: Page }> {
  const context = await harness.newContext();
  contexts.push(context);
  const page = await context.newPage();
  await page.goto(`${harness.baseUrl}/`);
  return { context, page };
}

/** Adds a <chat-form> to the page, the way a page would on load. */
async function mountForm(page: Page, schema: unknown, attributes: Record<string, string> = {}) {
  await page.evaluate(
    ({ schemaText, attrs }) => {
      const form = document.createElement('chat-form');
      form.setAttribute('schema', schemaText);
      for (const [name, value] of Object.entries(attrs)) form.setAttribute(name, value);
      document.body.appendChild(form);
    },
    { schemaText: JSON.stringify(schema), attrs: attributes },
  );
}

/** What the form is currently showing, without its stylesheet. */
async function shownText(page: Page, formIndex = 0): Promise<string> {
  return page.evaluate((index) => {
    const root = document.querySelectorAll('chat-form')[index]?.shadowRoot;
    if (!root) return '';
    return Array.from(root.children)
      .filter((child) => child.tagName !== 'STYLE')
      .map((child) => child.textContent ?? '')
      .join(' ')
      .replace(/\s+/g, ' ');
  }, formIndex);
}

/** Picks the first radio choice ("A") on page 1 and presses Continue. */
async function answerFirstPage(page: Page): Promise<void> {
  await page.locator('input[type="radio"]').first().check();
  await page.locator('[part="submit-btn"]').click();
}

describe('<chat-form> resuming after the page is reloaded', () => {
  it('opens on the page the visitor left, using the default storage', async () => {
    const { page } = await openPage();
    await mountForm(page, twoPageSchema);
    await page.waitForFunction(() =>
      document.querySelector('chat-form')?.shadowRoot?.textContent?.includes('Pick?'),
    );
    await answerFirstPage(page);
    await page.waitForFunction(() =>
      document.querySelector('chat-form')?.shadowRoot?.textContent?.includes('Tell us more'),
    );

    // A returning visitor: the page loads again and the form is added again.
    await page.reload();
    await mountForm(page, twoPageSchema);
    await page.waitForFunction(() => document.querySelector('chat-form')?.shadowRoot?.textContent);

    const text = await shownText(page);
    expect(text).toContain('Tell us more');
    expect(text).not.toContain('Pick?');
  });

  it('keeps two different forms on one page apart across a reload', async () => {
    const otherSchema = {
      'x-chat-version': '1',
      'x-chat-pages': [
        {
          id: 'only',
          title: 'Only',
          questions: [{ id: 'name', type: 'string', 'x-chat-input': 'text', title: 'Your name?' }],
          branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
        },
      ],
    };
    const { page } = await openPage();
    await mountForm(page, twoPageSchema);
    await mountForm(page, otherSchema);
    await page.locator('chat-form').first().locator('input[type="radio"]').first().check();
    await page.locator('chat-form').first().locator('[part="submit-btn"]').click();
    await page.waitForFunction(() =>
      document.querySelector('chat-form')?.shadowRoot?.textContent?.includes('Tell us more'),
    );

    await page.reload();
    await mountForm(page, twoPageSchema);
    await mountForm(page, otherSchema);
    await page.waitForFunction(() => document.querySelectorAll('chat-form').length === 2);

    expect(await shownText(page, 0)).toContain('Tell us more');
    expect(await shownText(page, 1)).toContain('Your name?');
  });

  it('does not pile up unreadable keys in localStorage on every page load', async () => {
    const { page } = await openPage();
    for (let load = 0; load < 3; load += 1) {
      await mountForm(page, twoPageSchema);
      await page.waitForFunction(
        () => document.querySelector('chat-form')?.shadowRoot?.textContent,
      );
      await page.reload();
    }
    const keys = await page.evaluate(() =>
      Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)),
    );
    expect(keys.filter((key) => key?.startsWith('car:inst:'))).toEqual([]);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBeLessThanOrEqual(3);
  });

  it('removes the keys an earlier version left behind', async () => {
    const { page } = await openPage();
    await page.evaluate(() => {
      localStorage.setItem('car:inst:3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b:car:session-id', 'old');
      localStorage.setItem('my-app:theme', 'dark');
    });
    await mountForm(page, twoPageSchema);
    await page.waitForFunction(() => document.querySelector('chat-form')?.shadowRoot?.textContent);
    const keys = await page.evaluate(() =>
      Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)),
    );
    expect(keys).toContain('my-app:theme');
    expect(keys.some((key) => key?.startsWith('car:inst:'))).toBe(false);
  });
});
