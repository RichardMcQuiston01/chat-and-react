import type { OutputAdapter, ChatEvent } from '@chat-and-react/core';

interface WebSocketLike {
  readyState: number;
  OPEN: number;
  send(data: string): void;
}

export class WebSocketOutputAdapter implements OutputAdapter {
  constructor(private readonly socket: WebSocketLike) {}

  emit(event: ChatEvent): void {
    if (this.socket.readyState === this.socket.OPEN) {
      this.socket.send(JSON.stringify(event));
    } else {
      console.warn('[chat-and-react] WebSocketOutputAdapter: socket not open');
    }
  }
}
