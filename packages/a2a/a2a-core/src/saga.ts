export type Step<TCtx> = (ctx: TCtx) => Promise<TCtx>;
export function saga<TCtx>(...steps: Step<TCtx>[]) {
  return async (ctx: TCtx) => {
    let cur = ctx;
    for (const s of steps) cur = await s(cur);
    return cur;
  };
}

