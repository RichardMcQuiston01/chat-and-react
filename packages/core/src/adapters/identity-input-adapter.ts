import type { InputAdapter } from '../types.js';

export class IdentityInputAdapter implements InputAdapter {
  transform(raw: unknown): unknown {
    return raw;
  }
}
