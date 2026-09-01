import { RateLimiter } from './rate-limiter';

describe('RateLimiter', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('lets a single call through immediately', async () => {
    const limiter = new RateLimiter(1000);
    const fn = jest.fn().mockResolvedValue('ok');

    await expect(limiter.schedule(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('spaces out a burst of calls by at least intervalMs', async () => {
    jest.useFakeTimers();
    const limiter = new RateLimiter(1000);
    const order: number[] = [];
    const calls = [1, 2, 3].map((n) =>
      limiter.schedule(() => {
        order.push(n);
        return Promise.resolve(n);
      }),
    );

    await jest.advanceTimersByTimeAsync(0);
    expect(order).toEqual([1]);

    await jest.advanceTimersByTimeAsync(1000);
    expect(order).toEqual([1, 2]);

    await jest.advanceTimersByTimeAsync(1000);
    expect(order).toEqual([1, 2, 3]);

    await Promise.all(calls);
  });
});
