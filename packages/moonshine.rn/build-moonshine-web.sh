#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$SCRIPT_DIR"
OUTPUT_DIR="$PACKAGE_DIR/prebuilt/web"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

MOONSHINE_JS_VERSION="$(node -p "require('$PACKAGE_DIR/package.json').moonshineJsVersion")"
MOONSHINE_JS_GIT_HEAD="$(node -p "require('$PACKAGE_DIR/package.json').moonshineJsGitHead")"

mkdir -p "$OUTPUT_DIR"
rm -rf "$OUTPUT_DIR/model"

cd "$TMP_DIR"
npm pack "@moonshine-ai/moonshine-js@${MOONSHINE_JS_VERSION}" >/dev/null
tar -xzf ./*.tgz

mkdir -p "$OUTPUT_DIR/model"
cp -R "$TMP_DIR/package/dist/model/." "$OUTPUT_DIR/model/"
mkdir -p "$OUTPUT_DIR/model/base/quantized"
curl -fsSL "https://download.moonshine.ai/model/base/quantized/encoder_model.onnx" \
  -o "$OUTPUT_DIR/model/base/quantized/encoder_model.onnx"
curl -fsSL "https://download.moonshine.ai/model/base/quantized/decoder_model_merged.onnx" \
  -o "$OUTPUT_DIR/model/base/quantized/decoder_model_merged.onnx"

cat > "$OUTPUT_DIR/build-metadata.json" <<EOF
{
  "moonshineJsVersion": "${MOONSHINE_JS_VERSION}",
  "moonshineJsGitHead": "${MOONSHINE_JS_GIT_HEAD}",
  "models": ["tiny", "base"],
  "source": "npm:@moonshine-ai/moonshine-js",
  "generatedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo "Moonshine web assets generated in $OUTPUT_DIR"
