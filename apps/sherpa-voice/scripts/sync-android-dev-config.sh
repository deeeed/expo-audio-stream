#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

APP_VARIANT="${APP_VARIANT:-development}"
METRO_PORT="${WATCHER_PORT:-7500}"
VALUES_DIR="android/app/src/main/res/values"
XML_DIR="android/app/src/main/res/xml"
MANIFEST_FILE="android/app/src/main/AndroidManifest.xml"

if [ "$APP_VARIANT" = "production" ]; then
  APP_SCHEME="sherpa-voice"
else
  APP_SCHEME="sherpa-voice-${APP_VARIANT}"
fi

mkdir -p "$VALUES_DIR" "$XML_DIR"

cat > "${VALUES_DIR}/dev_server_port.xml" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Override ReactAndroid default (8081) so dev launcher finds Metro on the right port -->
    <integer name="react_native_dev_server_port">${METRO_PORT}</integer>
</resources>
EOF

if [ "$APP_VARIANT" = "development" ]; then
  cat > "${XML_DIR}/network_security_config.xml" <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true" />
</network-security-config>
EOF
else
  cat > "${XML_DIR}/network_security_config.xml" <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">10.0.2.2</domain>
    <domain includeSubdomains="true">localhost</domain>
    <domain includeSubdomains="true">127.0.0.1</domain>
    <domain includeSubdomains="true">192.168.50.10</domain>
    <domain includeSubdomains="true">192.168.50.11</domain>
    <domain includeSubdomains="true">192.168.11.1</domain>
    <domain includeSubdomains="true">192.168.1.39</domain>
  </domain-config>
</network-security-config>
EOF
fi

if [ ! -f "$MANIFEST_FILE" ]; then
  echo "Missing ${MANIFEST_FILE}" >&2
  exit 1
fi

perl -0pi -e "s#<data android:scheme=\"[^\"]+\"/>\\n        <data android:scheme=\"exp\\+[^\"]+\"/>#<data android:scheme=\"${APP_SCHEME}\"/>\\n        <data android:scheme=\"exp+${APP_SCHEME}\"/>#g" "$MANIFEST_FILE"
