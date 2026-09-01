import { CursorAdapter } from './adapters/cursor.adapter';
import { GenericJsonAdapter } from './adapters/generic-json.adapter';
import type { Packet } from './adapter.interface';
import { AdapterService } from './adapter.service';

const SAMPLE_PACKET: Packet = {
  task: { id: 'TASK-1', title: 'Example task', status: 'pending' },
  decisions: [],
  debt: [],
};

function makeService(): AdapterService {
  return new AdapterService(new GenericJsonAdapter(), new CursorAdapter());
}

describe('AdapterService', () => {
  it('registers both reference adapters on construction', () => {
    const service = makeService();

    expect(service.list().sort()).toEqual(['cursor', 'generic-json']);
  });

  it('formats a packet through a registered adapter', () => {
    const service = makeService();

    const formatted = service.get('generic-json').format(SAMPLE_PACKET);

    expect(formatted).toBe(JSON.stringify(SAMPLE_PACKET, null, 2));
  });

  it('throws for an adapter that was never registered', () => {
    const service = makeService();

    expect(() => service.get('claude-code')).toThrow(
      'no such adapter: claude-code',
    );
  });
});
