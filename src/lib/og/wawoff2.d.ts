/* wawoff2 ships no types: the two calls of its CommonJS entry (Google's WOFF2 codec in WebAssembly). */
declare module "wawoff2" {
  /** The TrueType or OpenType bytes a WOFF2 file wraps. */
  export function decompress(woff2: Uint8Array): Promise<Uint8Array>;
  export function compress(sfnt: Uint8Array): Promise<Uint8Array>;
  const wawoff2: { decompress: typeof decompress; compress: typeof compress };
  export default wawoff2;
}
