import { Injectable } from '@nestjs/common';
import type { PacketAdapter } from './adapter.interface';
import { GenericJsonAdapter } from './adapters/generic-json.adapter';

@Injectable()
export class AdapterService {
  private readonly adapters = new Map<string, PacketAdapter>();

  constructor(genericJsonAdapter: GenericJsonAdapter) {
    this.register(genericJsonAdapter);
  }

  register(adapter: PacketAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  get(name: string): PacketAdapter {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`no such adapter: ${name}`);
    }
    return adapter;
  }

  list(): string[] {
    return [...this.adapters.keys()];
  }
}
