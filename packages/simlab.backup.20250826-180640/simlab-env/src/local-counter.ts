export type Ctx = { n: number; target: number };
export type LocalEnv = {
  reset(): Promise<Ctx>;
  step(a: "inc" | "dec"): Promise<{ ctx: Ctx; reward: number; done: boolean }>;
};
export function counterEnv(init = { start: 0, target: 3 }): LocalEnv {
  let ctx: Ctx = { n: init.start, target: init.target };
  return {
    async reset() { ctx = { n: init.start, target: init.target }; return ctx; },
    async step(a) {
      ctx.n = a === "inc" ? ctx.n + 1 : ctx.n - 1;
      const done = ctx.n === ctx.target;
      const reward = done ? 1 : -0.01;
      return { ctx, reward, done };
    }
  };
}

