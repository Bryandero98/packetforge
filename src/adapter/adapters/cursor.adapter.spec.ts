import type { Packet } from '../adapter.interface';
import { CursorAdapter } from './cursor.adapter';

describe('CursorAdapter', () => {
  const adapter = new CursorAdapter();

  it('renders a task header, status, and every decision/debt note as a bullet', () => {
    const packet: Packet = {
      task: { id: 'CARD-MODEL', title: 'Card domain model', status: 'done' },
      decisions: [
        {
          note: 'Plain object, no behavior yet',
          loggedAt: '2026-08-29T05:00:00.000Z',
        },
      ],
      debt: [
        { note: 'No validation yet', loggedAt: '2026-08-30T05:00:00.000Z' },
      ],
    };

    const output = adapter.format(packet);

    expect(output).toContain('# Task: CARD-MODEL — Card domain model');
    expect(output).toContain('Status: done');
    expect(output).toContain('## Decisions');
    expect(output).toContain(
      '- Plain object, no behavior yet _(2026-08-29T05:00:00.000Z)_',
    );
    expect(output).toContain('## Debt');
    expect(output).toContain(
      '- No validation yet _(2026-08-30T05:00:00.000Z)_',
    );
  });

  it('renders an explicit "None recorded." line instead of an empty section', () => {
    const packet: Packet = {
      task: { id: 'CARD-MODEL', title: 'Card domain model', status: 'pending' },
      decisions: [],
      debt: [],
    };

    const output = adapter.format(packet);

    const decisionsSection = output
      .split('## Decisions')[1]
      .split('## Debt')[0];
    expect(decisionsSection).toContain('None recorded.');
    const debtSection = output.split('## Debt')[1];
    expect(debtSection).toContain('None recorded.');
  });

  it('is registered under the name "cursor"', () => {
    expect(adapter.name).toBe('cursor');
  });
});
