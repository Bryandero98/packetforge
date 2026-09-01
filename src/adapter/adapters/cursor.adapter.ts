import { Injectable } from '@nestjs/common';
import type { Packet, PacketAdapter } from '../adapter.interface';

// Cursor's own context mechanism (project rules, @-mentioned docs) is
// plain Markdown injected into the model's context window - not a
// structured API PacketForge could push into. So this adapter's job is
// producing a Markdown document shaped the way a human would paste one
// into a `.cursor/rules/*.mdc` file or an @-mention: a task header
// followed by "Decisions" and "Debt" sections, each note as its own
// bullet with the date it was logged. No decisions/no debt renders as an
// explicit "None recorded" line rather than an empty heading - an empty
// section reads as "PacketForge forgot to fill this in", not as "there's
// nothing to report yet".
@Injectable()
export class CursorAdapter implements PacketAdapter {
  readonly name = 'cursor';

  format(packet: Packet): string {
    const lines = [
      `# Task: ${packet.task.id} — ${packet.task.title}`,
      '',
      `Status: ${packet.task.status}`,
      '',
      '## Decisions',
      '',
      ...this.renderNotes(packet.decisions),
      '',
      '## Debt',
      '',
      ...this.renderNotes(packet.debt),
    ];
    return lines.join('\n');
  }

  private renderNotes(
    notes: readonly { note: string; loggedAt: string }[],
  ): string[] {
    if (notes.length === 0) return ['None recorded.'];
    return notes.map((entry) => `- ${entry.note} _(${entry.loggedAt})_`);
  }
}
