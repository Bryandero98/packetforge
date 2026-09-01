// The shape every adapter formats - a task plus the decisions/debt notes
// attached to it. Deliberately narrower than GraphService.getTaskDetail's
// own return type: embeddings (1536-number arrays) are dropped before a
// packet ever reaches an adapter, since no consumer of a formatted packet
// (a human, an AI tool's context window, an n8n workflow) has any use for
// the raw vector, and no adapter should have to know to skip it.
export interface Packet {
  readonly task: {
    readonly id: string;
    readonly title: string;
    readonly status: string;
  };
  readonly decisions: readonly {
    readonly note: string;
    readonly loggedAt: string;
  }[];
  readonly debt: readonly {
    readonly note: string;
    readonly loggedAt: string;
  }[];
}

// A PacketAdapter translates PacketForge's internal packet shape into
// whatever format a specific external tool expects (a CLI's stdout, an
// agent framework's system-prompt injection format, a webhook payload).
// This is PacketForge's main extension point: adding support for a new
// tool means adding one adapter, not touching the core graph/decision/debt
// modules.
export interface PacketAdapter {
  readonly name: string;
  format(packet: Packet): string;
}
