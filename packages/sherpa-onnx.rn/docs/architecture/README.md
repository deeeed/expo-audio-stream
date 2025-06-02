# Architecture Documentation

This directory contains architecture-related documentation for sherpa-onnx.rn.

## React Native Architecture Support

The sherpa-onnx.rn package is designed to work across different React Native architectures:

### Supported Architectures

- **Old Architecture (Bridge-based)**
  - Traditional Promise-based communication
  - React Native Bridge for native module calls
  - Asynchronous method execution

- **New Architecture (Fabric + TurboModules)**
  - JSI (JavaScript Interface) direct calls
  - Synchronous and asynchronous method support
  - Improved performance and memory management

- **Bridgeless Mode** (Future)
  - Experimental direct JSI without React Native Bridge
  - Maximum performance for native operations

### Current Status

✅ **Basic Integration**: Module structure validated across architectures
⏳ **Architecture-Specific Testing**: Planned for next validation phase
⏳ **Performance Optimization**: Architecture-specific optimizations planned

## Platform Support

- **Android**: Full support with native library integration
- **iOS**: Basic structure in place, full validation pending
- **Web**: WASM integration planned

## Next Steps

See [`next-validation-phase.md`](./next-validation-phase.md) for planned architecture-specific testing and validation work.