import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    outExtension({ format }) {
      return { js: format === 'esm' ? '.mjs' : '.cjs' };
    },
  },
  {
    entry: { 'chat-and-react': 'src/index.ts' },
    format: ['iife'],
    globalName: 'ChatAndReact',
    outExtension: () => ({ js: '.iife.js' }),
    clean: false,
  },
]);
