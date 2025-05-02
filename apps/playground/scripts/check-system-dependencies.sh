#!/bin/bash

# Text formatting for better readability
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print a section header
print_header() {
    echo -e "\n${BOLD}${BLUE}$1${NC}"
    echo -e "${BLUE}$(printf '=%.0s' {1..50})${NC}\n"
}

# Print success message
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Print warning message
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Print error message
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Print info message
print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

print_installation_instruction() {
    echo -e "   ${CYAN}→ $1${NC}"
}

# Detect operating system
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)
print_header "System Information"
echo -e "Operating System: ${BOLD}$(uname -s)${NC}"
echo -e "Platform: ${BOLD}$OS${NC}"

# Initialize counters
INSTALLED_COUNT=0
MISSING_COUNT=0
WARNING_COUNT=0

# Check if a command exists
check_command() {
    local cmd=$1
    local name=$2
    local install_instructions=$3
    
    if command -v $cmd &> /dev/null; then
        print_success "$name is installed: $(command -v $cmd)"
        INSTALLED_COUNT=$((INSTALLED_COUNT+1))
        return 0
    else
        print_error "$name is not installed"
        echo -e "   Installation instructions:"
        print_installation_instruction "$install_instructions"
        MISSING_COUNT=$((MISSING_COUNT+1))
        return 1
    fi
}

check_optional_command() {
    local cmd=$1
    local name=$2
    local install_instructions=$3
    
    if command -v $cmd &> /dev/null; then
        print_success "$name is installed: $(command -v $cmd)"
        INSTALLED_COUNT=$((INSTALLED_COUNT+1))
        return 0
    else
        print_warning "$name is not installed (optional)"
        echo -e "   Installation instructions:"
        print_installation_instruction "$install_instructions"
        WARNING_COUNT=$((WARNING_COUNT+1))
        return 1
    fi
}

# Basic development dependencies
print_header "Core Development Tools"

# Check Node.js
check_command "node" "Node.js" "Install from https://nodejs.org/en/download/ or use nvm (https://github.com/nvm-sh/nvm)"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    if [[ ${NODE_VERSION:1:2} -ge 16 ]]; then
        print_info "Node.js version is $NODE_VERSION"
    else
        print_warning "Node.js version $NODE_VERSION may be too old; version 16+ is recommended"
    fi
fi

# Check Yarn
check_command "yarn" "Yarn" "Install using: npm install -g yarn"
if command -v yarn &> /dev/null; then
    YARN_VERSION=$(yarn -v)
    print_info "Yarn version is $YARN_VERSION"
fi

# Check Git
check_command "git" "Git" "Install from https://git-scm.com/downloads"

# Check Watchman (optional but recommended)
check_optional_command "watchman" "Watchman" "Install using: brew install watchman (macOS) or follow https://facebook.github.io/watchman/docs/install.html"

# Expo-specific dependencies
print_header "Expo Development Tools"

# Check Expo CLI
check_command "expo" "Expo CLI" "Install using: npm install -g expo-cli"

# Check EAS CLI
check_command "eas" "Expo Application Services CLI" "Install using: npm install -g eas-cli"

# Screenshot and image processing dependencies
print_header "Screenshot and Image Processing Tools"

# Check ImageMagick (required for screenshot processing)
check_command "convert" "ImageMagick" "Install using: brew install imagemagick (macOS), apt-get install imagemagick (Linux), or download from https://imagemagick.org/script/download.php"
if command -v convert &> /dev/null; then
    IMAGEMAGICK_VERSION=$(convert --version | head -n 1)
    print_info "ImageMagick version: $IMAGEMAGICK_VERSION"
fi

# Platform-specific dependencies based on OS
if [[ "$OS" == "macos" ]]; then
    print_header "iOS Development Tools (macOS only)"
    
    # Check Xcode
    if command -v xcodebuild &> /dev/null; then
        XCODE_VERSION=$(xcodebuild -version | head -n 1)
        print_success "Xcode is installed: $XCODE_VERSION"
        INSTALLED_COUNT=$((INSTALLED_COUNT+1))
        
        # Check Xcode Command Line Tools
        if xcode-select -p &> /dev/null; then
            print_success "Xcode Command Line Tools are installed"
            INSTALLED_COUNT=$((INSTALLED_COUNT+1))
        else
            print_error "Xcode Command Line Tools are not installed"
            print_installation_instruction "Install using: xcode-select --install"
            MISSING_COUNT=$((MISSING_COUNT+1))
        fi
    else
        print_error "Xcode is not installed"
        print_installation_instruction "Install Xcode from the Mac App Store"
        MISSING_COUNT=$((MISSING_COUNT+1))
    fi
    
    # Check CocoaPods
    check_command "pod" "CocoaPods" "Install using: sudo gem install cocoapods"
    
    # Check Fastlane
    check_command "fastlane" "Fastlane" "Install using: brew install fastlane or gem install fastlane"
    
    print_header "Android Development Tools"
    
    # Check for Android SDK via ANDROID_HOME
    if [[ -n "$ANDROID_HOME" && -d "$ANDROID_HOME" ]]; then
        print_success "Android SDK is installed at: $ANDROID_HOME"
        INSTALLED_COUNT=$((INSTALLED_COUNT+1))
        
        # Check for platform tools
        if [[ -d "$ANDROID_HOME/platform-tools" ]]; then
            print_success "Android Platform Tools are installed"
            INSTALLED_COUNT=$((INSTALLED_COUNT+1))
        else
            print_warning "Android Platform Tools might be missing from $ANDROID_HOME/platform-tools"
            WARNING_COUNT=$((WARNING_COUNT+1))
        fi
    elif [[ -n "$ANDROID_SDK_ROOT" && -d "$ANDROID_SDK_ROOT" ]]; then
        print_success "Android SDK is installed at: $ANDROID_SDK_ROOT"
        INSTALLED_COUNT=$((INSTALLED_COUNT+1))
    else
        print_error "Android SDK is not installed or ANDROID_HOME environment variable is not set"
        print_installation_instruction "Install Android Studio from https://developer.android.com/studio"
        print_installation_instruction "Then set ANDROID_HOME environment variable to the SDK location"
        MISSING_COUNT=$((MISSING_COUNT+1))
    fi
    
    # Check JDK
    if command -v javac &> /dev/null; then
        JAVA_VERSION=$(javac -version 2>&1)
        print_success "JDK is installed: $JAVA_VERSION"
        INSTALLED_COUNT=$((INSTALLED_COUNT+1))
    else
        print_error "JDK is not installed"
        print_installation_instruction "Install using: brew install --cask adoptopenjdk/openjdk/adoptopenjdk11"
        MISSING_COUNT=$((MISSING_COUNT+1))
    fi

else
    print_warning "iOS development tools check skipped (only available on macOS)"
    WARNING_COUNT=$((WARNING_COUNT+1))
    
    print_header "Android Development Tools"
    
    # Check for Android SDK
    if [[ -n "$ANDROID_HOME" && -d "$ANDROID_HOME" ]]; then
        print_success "Android SDK is installed at: $ANDROID_HOME"
        INSTALLED_COUNT=$((INSTALLED_COUNT+1))
    elif [[ -n "$ANDROID_SDK_ROOT" && -d "$ANDROID_SDK_ROOT" ]]; then
        print_success "Android SDK is installed at: $ANDROID_SDK_ROOT"
        INSTALLED_COUNT=$((INSTALLED_COUNT+1))
    else
        print_error "Android SDK is not installed or ANDROID_HOME environment variable is not set"
        print_installation_instruction "Install Android Studio from https://developer.android.com/studio"
        print_installation_instruction "Then set ANDROID_HOME environment variable to the SDK location"
        MISSING_COUNT=$((MISSING_COUNT+1))
    fi
    
    # Check JDK
    if command -v javac &> /dev/null; then
        JAVA_VERSION=$(javac -version 2>&1)
        print_success "JDK is installed: $JAVA_VERSION"
        INSTALLED_COUNT=$((INSTALLED_COUNT+1))
    else
        print_error "JDK is not installed"
        if [[ "$OS" == "linux" ]]; then
            print_installation_instruction "Install using: sudo apt-get install openjdk-11-jdk"
        else
            print_installation_instruction "Install from https://adoptopenjdk.net/"
        fi
        MISSING_COUNT=$((MISSING_COUNT+1))
    fi
fi

# Web deployment tools
print_header "Web Deployment Tools"

# Check gh-pages
check_optional_command "gh-pages" "gh-pages" "Install using: npm install -g gh-pages"

# Check gh CLI (GitHub CLI) - optional
check_optional_command "gh" "GitHub CLI" "Install using: brew install gh (macOS) or follow https://github.com/cli/cli#installation"

# Summary
print_header "Summary"
echo -e "${GREEN}$INSTALLED_COUNT components installed correctly${NC}"
echo -e "${YELLOW}$WARNING_COUNT optional components missing${NC}"
echo -e "${RED}$MISSING_COUNT required components missing${NC}"

if [[ $MISSING_COUNT -gt 0 ]]; then
    echo -e "\n${YELLOW}⚠ Please install the missing components before proceeding with development or deployment.${NC}"
    exit 1
else
    if [[ $WARNING_COUNT -gt 0 ]]; then
        echo -e "\n${GREEN}✓ All required components are installed! You may want to install the optional components for a better experience.${NC}"
    else
        echo -e "\n${GREEN}✓ Congratulations! Your system is fully set up for AudioPlayground development and deployment.${NC}"
    fi
    exit 0
fi 