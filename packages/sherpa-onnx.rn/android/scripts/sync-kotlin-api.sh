#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPO_ROOT="$(cd "$PACKAGE_ROOT/../.." && pwd)"
UPSTREAM_DIR="$PACKAGE_ROOT/third_party/sherpa-onnx/sherpa-onnx/kotlin-api"
TARGET_DIR="$PACKAGE_ROOT/android/src/main/kotlin/com/k2fsa/sherpa/onnx"
PATCH_FILE="$PACKAGE_ROOT/patches/KotlinApiOverrides.patch"

if [ ! -d "$UPSTREAM_DIR" ]; then
  echo "Missing upstream Kotlin API directory: $UPSTREAM_DIR" >&2
  exit 1
fi

if [ ! -f "$PATCH_FILE" ]; then
  echo "Missing Kotlin API patch file: $PATCH_FILE" >&2
  exit 1
fi

for target_file in "$TARGET_DIR"/*.kt; do
  file_name="$(basename "$target_file")"
  upstream_file="$UPSTREAM_DIR/$file_name"
  if [ -f "$upstream_file" ]; then
    cp "$upstream_file" "$target_file"
  fi
done

git -C "$REPO_ROOT" apply --whitespace=nowarn "$PATCH_FILE"

