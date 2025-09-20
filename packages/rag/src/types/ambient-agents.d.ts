// Ambient module to allow optional dynamic import of '@cortex-os/agents' without TS resolution errors.
declare module '@cortex-os/agents' {
  // We don't need types here; runtime shape is checked where used.
  const anyExport: unknown;
  export = anyExport;
}
