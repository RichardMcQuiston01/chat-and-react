import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { type Browser, type BrowserContext, chromium } from 'playwright';

const PAGE_HTML =
  '<!doctype html><html><head><meta charset="utf-8"><title>chat-and-react browser tests</title></head><body><script src="/bundle.js"></script></body></html>';

export interface Harness {
  /** Address of the local server both tabs load, for example `http://127.0.0.1:41234`. */
  readonly baseUrl: string;
  /** A fresh browser context: its own localStorage, sessionStorage and IndexedDB. */
  newContext(): Promise<BrowserContext>;
  close(): Promise<void>;
}

/** Bundles `src/page-entry.ts` for the browser, serves it locally, and launches Chromium. */
export async function startHarness(): Promise<Harness> {
  const bundle = await build({
    entryPoints: [fileURLToPath(new URL('./page-entry.ts', import.meta.url))],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    write: false,
    // The web component imports core by package name; use core's source so no build is needed.
    alias: {
      '@richardmcquiston01/chat-and-react-core': fileURLToPath(
        new URL('../../core/src/index.ts', import.meta.url),
      ),
    },
  });
  const script = bundle.outputFiles[0]?.text;
  if (script === undefined) {
    throw new Error('esbuild produced no output for src/page-entry.ts');
  }

  const server: Server = createServer((request, response) => {
    if (request.url === '/bundle.js') {
      response.writeHead(200, { 'content-type': 'text/javascript' }).end(script);
    } else if (request.url === '/') {
      response.writeHead(200, { 'content-type': 'text/html' }).end(PAGE_HTML);
    } else {
      response.writeHead(404).end('not found');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  // CHROMIUM_PATH points at an installed Chromium when Playwright's own download is not available.
  const browser: Browser = await chromium.launch({
    executablePath: process.env['CHROMIUM_PATH'] || undefined,
  });

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    newContext: () => browser.newContext(),
    close: async () => {
      await browser.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
