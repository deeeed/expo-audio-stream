# Performance

Learn about the performance characteristics of expo-audio-stream and how to optimize your audio recording configurations.

## Overview

expo-audio-stream is built with performance as a core priority. The library has undergone significant optimizations to ensure fast, reliable audio recording across all platforms.

### Key Performance Features

- **Fast Stop Recording**: < 200ms stop time for recordings of any duration
- **Efficient Memory Usage**: Optimized buffer management for minimal memory footprint
- **Cross-Platform Consistency**: Similar performance characteristics on Android and iOS
- **Real-Time Processing**: Support for live audio analysis without impacting recording

## Recent Performance Improvements

### Stop Recording Optimization (99%+ Improvement)

A comprehensive performance analysis and optimization was completed, resulting in dramatic improvements:

- **Android**: 92% improvement (1070ms → 124ms for 10-minute recordings)
- **iOS**: 99.3% improvement (2554ms → 18ms for 10-minute recordings)
- **Cross-Platform Parity**: Both platforms now perform identically well

[Learn more about the optimization →](https://github.com/deeeed/expo-audio-stream/blob/main/packages/expo-audio-studio/docs/STOP_RECORDING_PERFORMANCE_ANALYSIS.md)

## Performance Resources

### [File Sizes Guide](./file-sizes)
Understand how different recording configurations affect file sizes with real-world measurements.

### Configuration Guide
Choose the optimal settings for your specific use case:

- **Voice Recording**: 16 kHz, Mono, 16-bit
- **Music Recording**: 44.1 kHz, Stereo, 16-bit
- **Professional**: 48 kHz, Stereo, 32-bit

### Testing Your Performance

You can validate performance in your own application using the agent validation workflow:

```typescript
// Deep link to test specific configuration
const testUrl = 'audioplayground://agent-validation?sampleRate=44100&channels=2&encoding=pcm_16bit';
```

## Continuous Performance Monitoring

Performance is continuously validated through:

- Automated E2E tests on real devices
- Performance regression detection
- Regular benchmarking across different configurations

All performance claims are backed by actual test data from real devices.