import { Injectable } from '@nestjs/common';
import type { PacketAdapter } from '../adapter.interface';

// The reference adapter: no tool-specific formatting, just the packet as
// pretty-printed JSON. Every new adapter (Claude Code, Cursor, Aider, a
// custom webhook shape, ...) follows this same shape — implement
// PacketAdapter, register it in AdapterModule's providers.
@Injectable()
export class GenericJsonAdapter implements PacketAdapter {
  readonly name = 'generic-json';

  format(packet: unknown): string {
    return JSON.stringify(packet, null, 2);
  }
}
