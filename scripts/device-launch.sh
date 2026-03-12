#!/bin/bash
# ========================================================
# Unified Device Launch Script (iOS + Android)
# ========================================================
# Interactive device picker that works across both platforms.
# Detects all available iOS simulators and Android devices,
# presents a unified list, and launches the app on the selected one.
#
# Usage:
#   ./scripts/device-launch.sh --scheme audioplayground --port 7365
#   ./scripts/device-launch.sh --scheme sherpa-voice --port 7500
#   ./scripts/device-launch.sh --scheme audioplayground --port 7365 --platform ios
#   ./scripts/device-launch.sh --scheme audioplayground --port 7365 --platform android
# ========================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_SCHEME="${APP_SCHEME:-}"
METRO_PORT="${METRO_PORT:-}"
PLATFORM="${PLATFORM:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${BLUE}[info]${NC} $1"; }
success() { echo -e "${GREEN}[ok]${NC} $1"; }
warn()    { echo -e "${YELLOW}[warn]${NC} $1"; }
error()   { echo -e "${RED}[error]${NC} $1"; }

while [[ $# -gt 0 ]]; do
    case $1 in
        --scheme)       APP_SCHEME="$2"; shift 2 ;;
        --port|-p)      METRO_PORT="$2"; shift 2 ;;
        --platform)     PLATFORM="$2"; shift 2 ;;
        *) error "Unknown option: $1"; exit 1 ;;
    esac
done

if [ -z "$APP_SCHEME" ]; then
    error "App scheme required. Use --scheme <scheme>"
    exit 1
fi
if [ -z "$METRO_PORT" ]; then
    error "Metro port required. Use --port <port>"
    exit 1
fi

# ========================================================
# Collect all devices
# ========================================================
ALL_DEVICES=()
DEVICE_TYPES=()     # "ios" or "android"
DEVICE_IDS=()       # UDID or ADB serial
DEVICE_NAMES=()     # Human-readable name

# iOS simulators
if [ -z "$PLATFORM" ] || [ "$PLATFORM" = "ios" ]; then
    if command -v xcrun &>/dev/null; then
        while IFS= read -r line; do
            if [ -n "$line" ]; then
                display=$(echo "$line" | cut -d'|' -f1)
                udid=$(echo "$line" | cut -d'|' -f2)
                name=$(echo "$line" | cut -d'|' -f3)
                ALL_DEVICES+=("${CYAN}iOS${NC}  $display")
                DEVICE_TYPES+=("ios")
                DEVICE_IDS+=("$udid")
                DEVICE_NAMES+=("$name")
            fi
        done < <(xcrun simctl list devices -j 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
devices = []
for runtime, devs in data.get('devices', {}).items():
    ver = ''
    if 'iOS' in runtime:
        parts = runtime.split('iOS')[-1].replace('-', '.').strip('.')
        ver = f' (iOS {parts})'
    for d in devs:
        if d['isAvailable']:
            state = ' [Booted]' if d['state'] == 'Booted' else ''
            devices.append(f\"{d['name']}{ver}{state}|{d['udid']}|{d['name']}\")
devices.sort(key=lambda x: (0 if '[Booted]' in x else 1, x))
for d in devices:
    print(d)
" 2>/dev/null)
    fi
fi

# Android devices
if [ -z "$PLATFORM" ] || [ "$PLATFORM" = "android" ]; then
    if command -v adb &>/dev/null; then
        while IFS= read -r line; do
            if [ -n "$line" ]; then
                serial=$(echo "$line" | awk '{print $1}')
                model=$(echo "$line" | sed -n 's/.*model:\([^ ]*\).*/\1/p')
                display="${model:-$serial} ($serial)"
                ALL_DEVICES+=("${GREEN}AND${NC}  $display")
                DEVICE_TYPES+=("android")
                DEVICE_IDS+=("$serial")
                DEVICE_NAMES+=("$serial")
            fi
        done < <(adb devices -l 2>/dev/null | grep -v "^List" | grep -v "^$" | grep "device$\|device " || true)
    fi
fi

if [ ${#ALL_DEVICES[@]} -eq 0 ]; then
    error "No devices found."
    [ -z "$PLATFORM" ] && info "Check that simulators are available or Android devices are connected."
    exit 1
fi

# ========================================================
# Display and select
# ========================================================
echo ""
echo -e "${BOLD}Available devices:${NC}"
echo ""
for i in "${!ALL_DEVICES[@]}"; do
    printf "  ${BLUE}%2d)${NC} %b\n" "$((i + 1))" "${ALL_DEVICES[$i]}"
done
echo ""

TOTAL=${#ALL_DEVICES[@]}
printf "  Select device [1-${TOTAL}]: "
read -r SELECTION

if ! [[ "$SELECTION" =~ ^[0-9]+$ ]] || [ "$SELECTION" -lt 1 ] || [ "$SELECTION" -gt "$TOTAL" ]; then
    error "Invalid selection: $SELECTION"
    exit 1
fi

IDX=$((SELECTION - 1))
SELECTED_TYPE="${DEVICE_TYPES[$IDX]}"
SELECTED_ID="${DEVICE_IDS[$IDX]}"
SELECTED_NAME="${DEVICE_NAMES[$IDX]}"

echo ""
success "Selected: $SELECTED_NAME ($SELECTED_TYPE)"

# ========================================================
# Delegate to platform-specific script
# ========================================================
if [ "$SELECTED_TYPE" = "ios" ]; then
    exec "$SCRIPT_DIR/ios-launch.sh" --simulator "$SELECTED_NAME" --scheme "$APP_SCHEME" --port "$METRO_PORT"
else
    exec "$SCRIPT_DIR/android-launch.sh" --device "$SELECTED_ID" --scheme "$APP_SCHEME" --port "$METRO_PORT"
fi
