import type { OutputAdapter, ChatEvent } from '@chat-and-react/core';

interface EventEmitterLike {
  emit(event: string, ...args: unknown[]): void;
}

export class EventEmitterOutputAdapter implements OutputAdapter {
  constructor(private readonly emitter: EventEmitterLike) {}

  emit(event: ChatEvent): void {
    this.emitter.emit(event.type, event);
  }
}
