import { defineConfig } from 'vite';

// A relative base lets the built demo work from any sub-path, such as
// https://<user>.github.io/chat-and-react/, as well as from a domain root.
export default defineConfig({
  base: './',
});
