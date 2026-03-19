#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PKG_DIR="$(dirname "$SCRIPT_DIR")"
CPP_DIR="$PKG_DIR/cpp"
OUT_DIR="$PKG_DIR/prebuilt/wasm"
TMP_DIR="$(mktemp -d)"

mkdir -p "$OUT_DIR"

echo "Building mel-spectrogram WASM module..."

# Compile C files separately (no -std=c++17)
emcc -O2 -I"$CPP_DIR/kiss_fft" -c "$CPP_DIR/kiss_fft/kiss_fft.c" -o "$TMP_DIR/kiss_fft.o"
emcc -O2 -I"$CPP_DIR/kiss_fft" -c "$CPP_DIR/kiss_fft/kiss_fftr.c" -o "$TMP_DIR/kiss_fftr.o"

# Compile C++ files
emcc -O2 -std=c++17 -I"$CPP_DIR" -I"$CPP_DIR/kiss_fft" -c "$CPP_DIR/MelSpectrogram.cpp" -o "$TMP_DIR/MelSpectrogram.o"
emcc -O2 -std=c++17 -I"$CPP_DIR" -I"$CPP_DIR/kiss_fft" -c "$CPP_DIR/MelSpectrogramBridge.cpp" -o "$TMP_DIR/MelSpectrogramBridge.o"

# Link
emcc \
  "$TMP_DIR/kiss_fft.o" \
  "$TMP_DIR/kiss_fftr.o" \
  "$TMP_DIR/MelSpectrogram.o" \
  "$TMP_DIR/MelSpectrogramBridge.o" \
  -O2 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME="createMelSpectrogramModule" \
  -s EXPORTED_FUNCTIONS='["_mel_spectrogram_compute","_mel_spectrogram_free","_mel_spectrogram_init","_mel_spectrogram_compute_frame","_mel_spectrogram_get_n_mels","_malloc","_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","getValue"]' \
  -s SINGLE_FILE=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s ENVIRONMENT='web' \
  -o "$OUT_DIR/mel-spectrogram.js"

rm -rf "$TMP_DIR"

echo "Built: $OUT_DIR/mel-spectrogram.js ($(wc -c < "$OUT_DIR/mel-spectrogram.js" | tr -d ' ') bytes)"
