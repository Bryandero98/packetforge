// A PacketAdapter translates PacketForge's internal packet shape into
// whatever format a specific external tool expects (a CLI's stdout, an
// agent framework's system-prompt injection format, a webhook payload).
// This is PacketForge's main extension point: adding support for a new
// tool means adding one adapter, not touching the core graph/decision/debt
// modules.
export interface PacketAdapter {
  readonly name: string;
  format(packet: unknown): string;
}
