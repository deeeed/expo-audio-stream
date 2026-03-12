#!/bin/bash
# ========================================================
# iOS Simulator Launch Script
# ========================================================
# Reliably boots and launches an app on a specific simulator
# by resolving the name to UDID, avoiding Expo CLI's buggy
# deep link targeting when multiple simulators are booted.
#
# Usage:
#   ./scripts/ios-launch.sh --simulator "AudioPlayground-Dev" --scheme "audioplayground" --port 7365
#   ./scripts/ios-launch.sh --simulator "SherpaVoice-Dev" --scheme "sherpa-voice" --port 7500
#   ./scripts/ios-launch.sh --select --scheme "audioplayground" --port 7365   # interactive picker
#
# Can also be called with env vars:
#   IOS_SIMULATOR="AudioPlayground-Dev" APP_SCHEME="audioplayground" METRO_PORT=7365 ./scripts/ios-launch.sh
# ========================================================

set -euo pipefail

# Defaults (can be overridden by flags or env vars)
SIMULATOR_NAME="${IOS_SIMULATOR:-}"
APP_SCHEME="${APP_SCHEME:-}"
METRO_PORT="${METRO_PORT:-}"
BOOT_ONLY=false
SKIP_METRO_CHECK=false
SELECT_MODE=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}[info]${NC} $1"; }
success() { echo -e "${GREEN}[ok]${NC} $1"; }
warn()    { echo -e "${YELLOW}[warn]${NC} $1"; }
error()   { echo -e "${RED}[error]${NC} $1"; }

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --simulator|-s) SIMULATOR_NAME="$2"; shift 2 ;;
        --scheme)       APP_SCHEME="$2"; shift 2 ;;
        --port|-p)      METRO_PORT="$2"; shift 2 ;;
        --boot-only)    BOOT_ONLY=true; shift ;;
        --skip-metro)   SKIP_METRO_CHECK=true; shift ;;
        --select)       SELECT_MODE=true; shift ;;
        *) error "Unknown option: $1"; exit 1 ;;
    esac
done

# ========================================================
# Interactive simulator selection
# ========================================================
if [ "$SELECT_MODE" = true ] || [ -z "$SIMULATOR_NAME" ]; then
    # Build list of available simulators (available only)
    DEVICES_JSON=$(xcrun simctl list devices -j 2>/dev/null)
    DEVICE_LIST=$(echo "$DEVICES_JSON" | python3 -c "
import json, sys
data = json.load(sys.stdin)
devices = []
for runtime, devs in data.get('devices', {}).items():
    # Extract iOS version from runtime string
    ver = ''
    if 'iOS' in runtime:
        parts = runtime.split('iOS')[-1].replace('-', '.').strip('.')
        ver = f' (iOS {parts})'
    for d in devs:
        if d['isAvailable']:
            state = ' [Booted]' if d['state'] == 'Booted' else ''
            devices.append(f\"{d['name']}{ver}{state}|{d['udid']}|{d['name']}\")
# Sort: booted first, then by name
devices.sort(key=lambda x: (0 if '[Booted]' in x else 1, x))
for d in devices:
    print(d)
" 2>/dev/null)

    if [ -z "$DEVICE_LIST" ]; then
        error "No available simulators found."
        exit 1
    fi

    echo ""
    info "Available simulators:"
    echo ""
    i=1
    while IFS= read -r line; do
        display=$(echo "$line" | cut -d'|' -f1)
        printf "  ${BLUE}%2d)${NC} %s\n" "$i" "$display"
        i=$((i + 1))
    done <<< "$DEVICE_LIST"
    echo ""

    TOTAL=$(echo "$DEVICE_LIST" | wc -l | tr -d ' ')
    printf "  Select simulator [1-${TOTAL}]: "
    read -r SELECTION

    if ! [[ "$SELECTION" =~ ^[0-9]+$ ]] || [ "$SELECTION" -lt 1 ] || [ "$SELECTION" -gt "$TOTAL" ]; then
        error "Invalid selection: $SELECTION"
        exit 1
    fi

    SELECTED_LINE=$(echo "$DEVICE_LIST" | sed -n "${SELECTION}p")
    SIMULATOR_NAME=$(echo "$SELECTED_LINE" | cut -d'|' -f3)
    success "Selected: $SIMULATOR_NAME"
fi

# Validate required params
if [ -z "$SIMULATOR_NAME" ]; then
    error "Simulator name required. Use --simulator <name>, --select, or set IOS_SIMULATOR env var."
    exit 1
fi

if [ "$BOOT_ONLY" = false ]; then
    if [ -z "$APP_SCHEME" ]; then
        error "App scheme required. Use --scheme <scheme> or set APP_SCHEME env var."
        exit 1
    fi
    if [ -z "$METRO_PORT" ]; then
        error "Metro port required. Use --port <port> or set METRO_PORT env var."
        exit 1
    fi
fi

# ========================================================
# Step 1: Resolve simulator name to UDID
# ========================================================
info "Resolving simulator: $SIMULATOR_NAME"

UDID=$(xcrun simctl list devices -j 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data.get('devices', {}).items():
    for d in devices:
        if d['name'] == '$SIMULATOR_NAME' and d['isAvailable']:
            print(d['udid'])
            sys.exit(0)
sys.exit(1)
" 2>/dev/null) || true

if [ -z "$UDID" ]; then
    error "Simulator '$SIMULATOR_NAME' not found or not available."
    echo ""
    info "Available simulators:"
    xcrun simctl list devices available | grep -E "iPhone|iPad|Audio|Sherpa" | head -20
    exit 1
fi

success "Resolved: $SIMULATOR_NAME -> $UDID"

# ========================================================
# Step 2: Boot simulator if needed
# ========================================================
DEVICE_STATE=$(xcrun simctl list devices -j 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data.get('devices', {}).items():
    for d in devices:
        if d['udid'] == '$UDID':
            print(d['state'])
            sys.exit(0)
" 2>/dev/null)

if [ "$DEVICE_STATE" = "Booted" ]; then
    success "Simulator already booted"
else
    info "Booting simulator..."
    xcrun simctl boot "$UDID" 2>/dev/null || true
    sleep 2
    success "Simulator booted"
fi

# Open Simulator.app so it's visible
open -a Simulator 2>/dev/null || true

if [ "$BOOT_ONLY" = true ]; then
    success "Boot complete. UDID: $UDID"
    exit 0
fi

# ========================================================
# Step 3: Check Metro is running
# ========================================================
if [ "$SKIP_METRO_CHECK" = false ]; then
    if curl -s "http://localhost:${METRO_PORT}/status" 2>/dev/null | grep -q "packager-status:running"; then
        success "Metro running on port $METRO_PORT"
    else
        warn "Metro not detected on port $METRO_PORT"
        warn "Start it with: npx expo start --port $METRO_PORT --dev-client"
    fi
fi

# ========================================================
# Step 4: Send deep link to the correct simulator by UDID
# ========================================================
DEEP_LINK="exp+${APP_SCHEME}://expo-development-client/?url=http%3A%2F%2Flocalhost%3A${METRO_PORT}"

info "Sending deep link to $SIMULATOR_NAME ($UDID)"
info "  -> $DEEP_LINK"

xcrun simctl openurl "$UDID" "$DEEP_LINK"

success "Launched $APP_SCHEME on $SIMULATOR_NAME"
echo ""
info "Summary:"
echo "  Simulator: $SIMULATOR_NAME"
echo "  UDID:      $UDID"
echo "  Scheme:    $APP_SCHEME"
echo "  Metro:     http://localhost:$METRO_PORT"
