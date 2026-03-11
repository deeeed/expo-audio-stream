#!/bin/bash

CUSTOM_PORT=7500
CURRENT_FOLDER=$(dirname "$0")

# Color definitions
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting Metro port to: $CUSTOM_PORT${NC}"

# Array of files to update
FILES=(
    "$CURRENT_FOLDER/ios/Pods/Headers/Public/React-Core/React/RCTDefines.h"
    "$CURRENT_FOLDER/ios/Pods/Headers/Private/React-Core/React/RCTDefines.h"
    "$CURRENT_FOLDER/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/AgpConfiguratorUtils.kt"
    "$CURRENT_FOLDER/node_modules/@siteed/expo-audio-studio/node_modules/react-native/React/DevSupport/RCTInspectorDevServerHelper.mm"
)

for file in "${FILES[@]}"; do
    if [ -h "$file" ]; then
        # If it's a symlink, get the actual file
        actual_file=$(readlink -f "$file")
        echo -e "${YELLOW}Following symlink: $file -> $actual_file${NC}"
        if [ -f "$actual_file" ]; then
            if [[ $file == *".kt" ]]; then
                sed -i '' "s/DEFAULT_DEV_SERVER_PORT = \"8081\"/DEFAULT_DEV_SERVER_PORT = \"$CUSTOM_PORT\"/" "$actual_file"
            elif [[ $file == *"RCTInspectorDevServerHelper.mm" ]]; then
                sed -i '' "s/@8081/@$CUSTOM_PORT/" "$actual_file"
            else
                sed -i '' "s/RCT_METRO_PORT 8081/RCT_METRO_PORT $CUSTOM_PORT/" "$actual_file"
            fi
        fi
    elif [ -f "$file" ]; then
        # Regular file
        if [[ $file == *".kt" ]]; then
            sed -i '' "s/DEFAULT_DEV_SERVER_PORT = \"8081\"/DEFAULT_DEV_SERVER_PORT = \"$CUSTOM_PORT\"/" "$file"
        elif [[ $file == *"RCTInspectorDevServerHelper.mm" ]]; then
            sed -i '' "s/@8081/@$CUSTOM_PORT/" "$file"
        else
            sed -i '' "s/RCT_METRO_PORT 8081/RCT_METRO_PORT $CUSTOM_PORT/" "$file"
        fi
    else
        echo -e "${YELLOW}File not found: $file${NC}"
    fi
done

echo -e "${GREEN}Port update completed${NC}"
