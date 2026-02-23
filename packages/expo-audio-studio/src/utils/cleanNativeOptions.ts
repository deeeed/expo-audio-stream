/**
 * Strips non-serializable values (functions, ArrayBuffer, undefined) from
 * option objects before passing them to Expo native modules.
 *
 * Android's Kotlin bridge crashes with "Cannot convert '[object Object]' to a
 * Kotlin type" when it receives non-plain values such as `logger`, `ArrayBuffer`,
 * or `undefined` fields.  The JSON round-trip removes all of these safely.
 *
 * Only use this for small config objects (never for large audio buffers).
 *
 * NOTE: structuredClone() is intentionally NOT used here — it preserves
 * undefined values and non-JSON types, which is exactly what we need to strip.
 */
export function cleanNativeOptions<T>(options: T): T {
    // NOSONAR: JSON round-trip is deliberate — it strips undefined, functions,
    // and non-serializable values that structuredClone would preserve.
    return JSON.parse(JSON.stringify(options)) // NOSONAR
}
