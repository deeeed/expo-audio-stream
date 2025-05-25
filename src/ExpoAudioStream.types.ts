/**
 * Buffer duration in seconds. Controls the size of audio buffers
 * used during recording. Smaller values reduce latency but increase
 * CPU usage. Larger values improve efficiency but increase latency.
 * 
 * Platform Notes:
 * - iOS/macOS: Minimum effective 0.1s, uses accumulation below
 * - Android: Respects all sizes within hardware limits
 * - Web: Fully configurable
 * 
 * Default: undefined (uses platform default of 1024 frames)
 * When undefined: ~23ms at 44.1kHz, but iOS enforces 0.1s minimum
 * Recommended: 0.01 - 0.5 seconds
 * Optimal iOS: >= 0.1 seconds
 */
bufferDurationSeconds?: number; 