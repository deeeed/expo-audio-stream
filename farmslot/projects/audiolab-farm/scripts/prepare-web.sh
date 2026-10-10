#!/bin/bash
set -euo pipefail
cd "${1:?repo path required}"
# The beta workspace omits WASM. 1.3.1 publishes the same pinned sherpa 1.13.0 runtime.
CACHE="$PWD/.agent/cache/sherpa-wasm-1.3.1"
DEST="$PWD/apps/sherpa-voice/public/wasm"
mkdir -p "$CACHE" "$DEST"
for name in sherpa-onnx-wasm-combined.js sherpa-onnx-wasm-combined.wasm; do
  if [ ! -s "$CACHE/$name" ]; then
    curl --fail --location --proto '=https' --proto-redir '=https' --retry 2 --silent --show-error \
      "https://cdn.jsdelivr.net/npm/@siteed/sherpa-onnx.rn@1.3.1/wasm/$name" -o "$CACHE/$name.download"
    mv "$CACHE/$name.download" "$CACHE/$name"
  fi
  cp "$CACHE/$name" "$DEST/$name"
done
cp packages/sherpa-onnx.rn/wasm-src/*.js "$DEST/"
