#!/bin/bash
#
# Downloads and prepares model files for the sherpa-onnx web/WASM build.
# Reads web-models.config.json for model definitions.
# Idempotent: skips models whose target files already exist.
#
# Usage: ./scripts/download-web-models.sh [model_type]
#   model_type: optional, e.g. "tts", "asr", "vad" — downloads only that model

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$PROJECT_DIR/web-models.config.json"
TEMP_DIR=""

cleanup() {
  if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
  fi
}
trap cleanup EXIT

log() { echo "[$1] $2"; }

# Parse JSON config with python3
if ! command -v python3 &>/dev/null; then
  echo "ERROR: python3 is required to parse JSON config"
  exit 1
fi

if [ ! -f "$CONFIG_FILE" ]; then
  echo "ERROR: Config file not found: $CONFIG_FILE"
  exit 1
fi

FILTER="${1:-}"

# Get list of model types from config
MODEL_TYPES=$(python3 -c "
import json, sys
with open('$CONFIG_FILE') as f:
    cfg = json.load(f)
for k in cfg:
    print(k)
")

for MODEL_TYPE in $MODEL_TYPES; do
  if [ -n "$FILTER" ] && [ "$MODEL_TYPE" != "$FILTER" ]; then
    continue
  fi

  log "$MODEL_TYPE" "Processing..."

  # Read config for this model type
  eval "$(python3 -c "
import json, os
with open('$CONFIG_FILE') as f:
    cfg = json.load(f)
m = cfg['$MODEL_TYPE']
print(f'MODEL_URL=\"{m[\"url\"]}\"')
print(f'EXTRACT_DIR=\"{m[\"extractDir\"]}\"')
print(f'SINGLE_FILE={\"true\" if m.get(\"singleFile\") else \"false\"}')
print(f'RENAME_AS=\"{m.get(\"renameAs\", \"\")}\"')
print(f'ESPEAK_NG_DATA=\"{m.get(\"espeakNgData\", \"\")}\"')

# Emit file mappings as arrays
files = m.get('files', {})
targets = list(files.keys())
sources = list(files.values())
print(f'FILE_TARGETS=({\" \".join(repr(t) for t in targets)})')
print(f'FILE_SOURCES=({\" \".join(repr(s) for s in sources)})')

# Extra downloads
extras = m.get('extraDownloads', [])
extra_urls = [e['url'] for e in extras]
extra_names = [e['renameAs'] for e in extras]
print(f'EXTRA_URLS=({\" \".join(repr(u) for u in extra_urls)})')
print(f'EXTRA_NAMES=({\" \".join(repr(n) for n in extra_names)})')
")"

  TARGET_DIR="$PROJECT_DIR/$EXTRACT_DIR"
  mkdir -p "$TARGET_DIR"

  # Check if already downloaded (idempotent)
  ALL_EXIST=true
  if [ "$SINGLE_FILE" = "true" ]; then
    if [ ! -f "$TARGET_DIR/$RENAME_AS" ]; then
      ALL_EXIST=false
    fi
  else
    for target in "${FILE_TARGETS[@]}"; do
      if [ ! -f "$TARGET_DIR/$target" ]; then
        ALL_EXIST=false
        break
      fi
    done
    # Check espeak-ng-data
    if [ -n "$ESPEAK_NG_DATA" ] && [ ! -d "$TARGET_DIR/espeak-ng-data" ]; then
      ALL_EXIST=false
    fi
    # Check extra downloads
    for ename in "${EXTRA_NAMES[@]}"; do
      if [ ! -f "$TARGET_DIR/$ename" ]; then
        ALL_EXIST=false
        break
      fi
    done
  fi

  if [ "$ALL_EXIST" = "true" ]; then
    log "$MODEL_TYPE" "All files already exist, skipping."
    continue
  fi

  TEMP_DIR="$(mktemp -d)"

  # Download main file
  DOWNLOAD_FILE="$TEMP_DIR/download"
  log "$MODEL_TYPE" "Downloading $MODEL_URL ..."
  curl -L --progress-bar -o "$DOWNLOAD_FILE" "$MODEL_URL"

  if [ "$SINGLE_FILE" = "true" ]; then
    cp "$DOWNLOAD_FILE" "$TARGET_DIR/$RENAME_AS"
    log "$MODEL_TYPE" "Saved as $RENAME_AS"
  else
    # Extract tar.bz2
    log "$MODEL_TYPE" "Extracting archive..."
    tar xjf "$DOWNLOAD_FILE" -C "$TEMP_DIR"

    # Copy mapped files (source path in tar -> target filename)
    for i in "${!FILE_TARGETS[@]}"; do
      target="${FILE_TARGETS[$i]}"
      source="${FILE_SOURCES[$i]}"
      src_path="$TEMP_DIR/$source"
      if [ -f "$src_path" ]; then
        cp "$src_path" "$TARGET_DIR/$target"
        log "$MODEL_TYPE" "  $target"
      else
        log "$MODEL_TYPE" "  WARNING: source file not found: $source"
      fi
    done

    # Handle espeak-ng-data directory
    if [ -n "$ESPEAK_NG_DATA" ]; then
      ESPEAK_SRC="$TEMP_DIR/$ESPEAK_NG_DATA"
      if [ -d "$ESPEAK_SRC" ]; then
        # Copy directory tree
        rm -rf "$TARGET_DIR/espeak-ng-data"
        cp -R "$ESPEAK_SRC" "$TARGET_DIR/espeak-ng-data"
        log "$MODEL_TYPE" "  espeak-ng-data/ (directory)"

        # Also create espeak-ng-data.zip for web TTS loader
        (cd "$TARGET_DIR" && zip -r -q espeak-ng-data.zip espeak-ng-data/)
        log "$MODEL_TYPE" "  espeak-ng-data.zip (created)"
      else
        log "$MODEL_TYPE" "  WARNING: espeak-ng-data directory not found: $ESPEAK_NG_DATA"
      fi
    fi
  fi

  # Handle extra downloads (e.g., speaker embedding model)
  for i in "${!EXTRA_URLS[@]}"; do
    eurl="${EXTRA_URLS[$i]}"
    ename="${EXTRA_NAMES[$i]}"
    if [ ! -f "$TARGET_DIR/$ename" ]; then
      log "$MODEL_TYPE" "Downloading extra: $ename ..."
      curl -L --progress-bar -o "$TARGET_DIR/$ename" "$eurl"
      log "$MODEL_TYPE" "  $ename"
    fi
  done

  # Clean up temp for this model
  rm -rf "$TEMP_DIR"
  TEMP_DIR=""

  log "$MODEL_TYPE" "Done."
  echo ""
done

echo "All models ready."
