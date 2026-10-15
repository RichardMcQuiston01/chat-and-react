// Bundled for the browser and exposed as `window.lib`, so tests can drive the library from a page.
import { createErrorLogStore, IndexedDbErrorAdapter } from '@richardmcquiston01/error-log-adapter';
// Registers the <chat-form> element.
import '../../web/src/index.js';
import {
  AdapterSessionManager,
  indexedDbAdapter,
  localStorageAdapter,
  sessionStorageAdapter,
} from '../../core/src/index.js';

const lib = {
  AdapterSessionManager,
  IndexedDbErrorAdapter,
  createErrorLogStore,
  indexedDbAdapter,
  localStorageAdapter,
  sessionStorageAdapter,
};

export type PageLibrary = typeof lib;

declare global {
  interface Window {
    lib: PageLibrary;
  }
}

window.lib = lib;
