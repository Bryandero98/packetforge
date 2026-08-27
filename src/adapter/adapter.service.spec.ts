import { GenericJsonAdapter } from './adapters/generic-json.adapter';
import { AdapterService } from './adapter.service';

describe('AdapterService', () => {
  it('registers the reference generic-json adapter on construction', () => {
    const service = new AdapterService(new GenericJsonAdapter());

    expect(service.list()).toEqual(['generic-json']);
  });

  it('formats a packet through a registered adapter', () => {
    const service = new AdapterService(new GenericJsonAdapter());

    const formatted = service.get('generic-json').format({ id: 'TASK-1' });

    expect(formatted).toBe(JSON.stringify({ id: 'TASK-1' }, null, 2));
  });

  it('throws for an adapter that was never registered', () => {
    const service = new AdapterService(new GenericJsonAdapter());

    expect(() => service.get('claude-code')).toThrow(
      'no such adapter: claude-code',
    );
  });
});
