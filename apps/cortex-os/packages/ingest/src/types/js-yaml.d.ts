declare module 'js-yaml' {
  // Minimal surface used: load(yamlString: string): unknown
  export function load(str: string): unknown;
  const _default: { load: typeof load };
  export default _default;
}

