declare module 'gray-matter' {
  export interface GrayMatterFile<T> { data: Record<string, unknown>; content: T }
  const matter: (input: string) => GrayMatterFile<string>;
  export default matter;
}
declare module 'micromatch' {
  export function isMatch(str: string, pattern: string | string[]): boolean;
  const _default: { isMatch: typeof isMatch };
  export default _default;
}
