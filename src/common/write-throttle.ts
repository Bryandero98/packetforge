import type { ThrottlerOptions } from '@nestjs/throttler';

// Shared by every mutating endpoint (POST/PATCH/DELETE across graph,
// decisions, debt, projects) - tighter than ThrottlerModule.forRoot's
// global 100 req/min default, since a write is the thing an agent stuck
// in a retry loop can actually do damage with; a read can't.
export const WRITE_THROTTLE: Record<string, ThrottlerOptions> = {
  default: { ttl: 60000, limit: 20 },
};
