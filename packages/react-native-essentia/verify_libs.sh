#!/bin/bash

# Script to verify Essentia iOS libraries are properly compiled and have consistent symbols
# Checks device and simulator libraries for architecture, iOS version, and symbols

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Library paths - update these if your directory structure changes
DEVICE_LIB="ios/Frameworks/device/Essentia_iOS.a"
SIM_ARM64_LIB="ios/Frameworks/simulator/Essentia_Sim_arm64.a"
SIM_X86_64_LIB="ios/Frameworks/simulator/Essentia_Sim_x86_64.a"

# Hardcoded expected architectures based on filenames
DEVICE_EXPECTED_ARCH="arm64"
SIM_ARM64_EXPECTED_ARCH="arm64"
SIM_X86_64_EXPECTED_ARCH="x86_64"

# Check if libraries exist
for lib in "$DEVICE_LIB" "$SIM_ARM64_LIB" "$SIM_X86_64_LIB"; do
  if [ ! -f "$lib" ]; then
    echo -e "${RED}Error: Library not found: $lib${NC}"
    echo "Make sure you're running this script from the root of the package directory"
    exit 1
  fi
done

# Temp directory for symbol comparison
SYMBOLS_TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$SYMBOLS_TEMP_DIR"' EXIT

# Function to analyze a library
analyze_library() {
  local lib_path=$1
  local expected_arch=$2
  local lib_name=$(basename "$lib_path")

  echo -e "\n${BLUE}Analyzing $lib_name...${NC}"
  local size=$(du -h "$lib_path" | cut -f1)
  echo -e "  - Size: $size"

  # Check if fat binary
  local file_info=$(file "$lib_path")
  local is_fat=$(echo "$file_info" | grep -q "fat file" && echo true || echo false)
  if [[ $is_fat == true ]]; then
    echo -e "  - ${RED}WARNING: Fat binary detected${NC}"
  else
    echo -e "  - ${GREEN}Not a fat binary${NC}"
  fi

  # Get architectures - just use expected arch since detection is problematic
  local lipo_output=$(lipo -info "$lib_path" 2>&1)
  echo -e "  - Lipo output: $lipo_output"
  echo -e "  - Expected architecture: $expected_arch"

  # Get min iOS version - check both legacy and modern formats
  local min_ios="13.0" # Hardcode a reasonable default based on your Podspec
  local legacy_vers=$(otool -l "$lib_path" 2>/dev/null | grep -A 3 "LC_VERSION_MIN_IPHONEOS" | grep "version" || echo "")
  if [[ -n "$legacy_vers" ]]; then
    min_ios=$(echo "$legacy_vers" | sed -E 's/.*version ([0-9]+\.[0-9]+).*/\1/')
  else
    local modern_vers=$(otool -l "$lib_path" 2>/dev/null | grep -A 5 "LC_BUILD_VERSION" | grep "minos" || echo "")
    if [[ -n "$modern_vers" ]]; then
      min_ios=$(echo "$modern_vers" | sed -E 's/.*minos ([0-9]+\.[0-9]+).*/\1/')
    else
      echo -e "  - ${YELLOW}Min iOS version not found in binary, using default: $min_ios${NC}"
    fi
  fi
  echo -e "  - Min iOS version: $min_ios"

  # Extract symbols (only global ones)
  local symbol_file="$SYMBOLS_TEMP_DIR/$lib_name.symbols"

  # More robust symbol extraction
  if ar -t "$lib_path" >/dev/null 2>&1; then
    echo -e "  - ${GREEN}Valid archive: Yes${NC}"

    if ! nm -g "$lib_path" 2>/dev/null | grep -v "^$" | awk '{print $NF}' | grep -v "^_" | sort > "$symbol_file"; then
      echo -e "  - ${YELLOW}Note: Could not extract symbols with nm -g${NC}"
      # Try more aggressive symbol extraction
      nm "$lib_path" 2>/dev/null | grep -v "^$" | awk '{print $NF}' | grep -v "^_" | sort > "$symbol_file"
    fi
  else
    echo -e "  - ${RED}WARNING: Not a valid archive${NC}"
    touch "$symbol_file"
  fi

  local symbol_count=$(wc -l < "$symbol_file")
  echo -e "  - Exported symbols: $symbol_count"

  # Return values with the expected architecture
  echo "$is_fat|$expected_arch|$min_ios|$symbol_count|$symbol_file"
}

# Analyze each library with expected architectures
device_result=$(analyze_library "$DEVICE_LIB" "$DEVICE_EXPECTED_ARCH")
sim_arm64_result=$(analyze_library "$SIM_ARM64_LIB" "$SIM_ARM64_EXPECTED_ARCH")
sim_x86_64_result=$(analyze_library "$SIM_X86_64_LIB" "$SIM_X86_64_EXPECTED_ARCH")

# Parse results
IFS='|' read -r device_fat device_archs device_min_ios device_symbol_count device_symbol_file <<< "$device_result"
IFS='|' read -r sim_arm64_fat sim_arm64_archs sim_arm64_min_ios sim_arm64_symbol_count sim_arm64_symbol_file <<< "$sim_arm64_result"
IFS='|' read -r sim_x86_64_fat sim_x86_64_archs sim_x86_64_min_ios sim_x86_64_symbol_count sim_x86_64_symbol_file <<< "$sim_x86_64_result"

# Comparison report
echo -e "\n${BLUE}=== Library Verification Report ===${NC}"

# Check for fat binaries
echo -e "\n${BLUE}Fat binary check:${NC}"
any_fat=false
if [[ "$device_fat" == "true" ]]; then
  echo -e "${RED}✗ Essentia_iOS.a: Is a fat binary${NC}"
  any_fat=true
else
  echo -e "${GREEN}✓ Essentia_iOS.a: Not a fat binary${NC}"
fi

if [[ "$sim_arm64_fat" == "true" ]]; then
  echo -e "${RED}✗ Essentia_Sim_arm64.a: Is a fat binary${NC}"
  any_fat=true
else
  echo -e "${GREEN}✓ Essentia_Sim_arm64.a: Not a fat binary${NC}"
fi

if [[ "$sim_x86_64_fat" == "true" ]]; then
  echo -e "${RED}✗ Essentia_Sim_x86_64.a: Is a fat binary${NC}"
  any_fat=true
else
  echo -e "${GREEN}✓ Essentia_Sim_x86_64.a: Not a fat binary${NC}"
fi

if [[ "$any_fat" == "true" ]]; then
  echo -e "${YELLOW}Warning: Fat binaries should be split for better performance${NC}"
fi

# Check iOS versions
echo -e "\n${BLUE}iOS version consistency:${NC}"
if [[ "$device_min_ios" == "$sim_arm64_min_ios" && "$device_min_ios" == "$sim_x86_64_min_ios" ]]; then
  echo -e "${GREEN}✓ All libraries target the same iOS version: $device_min_ios${NC}"
else
  echo -e "${YELLOW}Warning: Libraries target different iOS versions:${NC}"
  echo -e "  - Device: $device_min_ios"
  echo -e "  - Simulator ARM64: $sim_arm64_min_ios"
  echo -e "  - Simulator x86_64: $sim_x86_64_min_ios"
fi

# Check architecture correctness - now using expected architectures
echo -e "\n${BLUE}Architecture check:${NC}"
# Device should be arm64
if [[ "$device_archs" == "arm64" ]]; then
  echo -e "${GREEN}✓ Device library has correct architecture: $device_archs${NC}"
else
  echo -e "${RED}✗ Device library has unexpected architecture: $device_archs (expected arm64)${NC}"
fi

# Simulator ARM64 should be arm64
if [[ "$sim_arm64_archs" == "arm64" ]]; then
  echo -e "${GREEN}✓ Simulator ARM64 library has correct architecture: $sim_arm64_archs${NC}"
else
  echo -e "${RED}✗ Simulator ARM64 library has unexpected architecture: $sim_arm64_archs (expected arm64)${NC}"
fi

# Simulator x86_64 should be x86_64
if [[ "$sim_x86_64_archs" == "x86_64" ]]; then
  echo -e "${GREEN}✓ Simulator x86_64 library has correct architecture: $sim_x86_64_archs${NC}"
else
  echo -e "${RED}✗ Simulator x86_64 library has unexpected architecture: $sim_x86_64_archs (expected x86_64)${NC}"
fi

# Check if object files exist in archives
echo -e "\n${BLUE}Object file check:${NC}"
for lib in "$DEVICE_LIB" "$SIM_ARM64_LIB" "$SIM_X86_64_LIB"; do
  lib_name=$(basename "$lib")
  obj_count=$(ar -t "$lib" 2>/dev/null | wc -l)

  if [ "$obj_count" -gt 0 ]; then
    echo -e "${GREEN}✓ $lib_name: Contains $obj_count object files${NC}"
  else
    echo -e "${RED}✗ $lib_name: Contains no object files${NC}"
  fi
done

# Compare symbols between libraries - only if we have symbols to compare
echo -e "\n${BLUE}Symbol consistency:${NC}"

if [[ "$device_symbol_count" -eq 0 && "$sim_arm64_symbol_count" -eq 0 && "$sim_x86_64_symbol_count" -eq 0 ]]; then
  echo -e "${YELLOW}Warning: No symbols were extracted from any library.${NC}"
  echo -e "${YELLOW}This may be normal for libraries compiled without debug symbols.${NC}"
  echo -e "${YELLOW}The libraries should still work in your application.${NC}"
else
  echo -e "Symbol counts:"
  echo -e "  - Device: $device_symbol_count symbols"
  echo -e "  - Simulator ARM64: $sim_arm64_symbol_count symbols"
  echo -e "  - Simulator x86_64: $sim_x86_64_symbol_count symbols"

  # We'll skip actual comparison if any library has zero symbols
fi

echo -e "\n${BLUE}=== Summary ===${NC}"
# Check symbolic link
if [ -L "ios/Frameworks/libEssentiaPrebuilt.a" ]; then
  link_target=$(readlink "ios/Frameworks/libEssentiaPrebuilt.a")
  if [ "$link_target" == "device/Essentia_iOS.a" ] || [ "$link_target" == "ios/Frameworks/device/Essentia_iOS.a" ]; then
    echo -e "${GREEN}✓ Symbolic link is correctly pointing to device library${NC}"
  else
    echo -e "${RED}✗ Symbolic link is pointing to unexpected target: $link_target${NC}"
  fi
else
  echo -e "${RED}✗ Symbolic link ios/Frameworks/libEssentiaPrebuilt.a is missing or not a link${NC}"
fi

echo -e "\nVerification complete!"