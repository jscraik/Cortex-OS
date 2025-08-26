type Maker<T, C=unknown> = (config: C) => Promise<T> | T;
export class Registry<T> {
  private m = new Map<string, Maker<T>>();
  register(kind: string, maker: Maker<T>) { this.m.set(kind, maker); }
  async make(kind: string, config: unknown) {
    const mk = this.m.get(kind); if (!mk) throw new Error(`unknown kind: ${kind}`);
    return mk(config as never);
  }
}

