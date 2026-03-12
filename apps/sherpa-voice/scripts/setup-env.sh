#!/bin/bash

# This script sets up the development environment with the appropriate app variant
# Usage: ./setup-env.sh [development|production] [force]

# Default values
VARIANT=${1:-development}
FORCE=${2:-no}

# Function to setup dev environment
setup_dev_environment() {
  echo "Setting up development environment..."
  APP_VARIANT=development yarn expo prebuild --clean
  echo "✅ Development environment ready for SherpaVoiceDev"
}

# Function to setup production environment
setup_production_environment() {
  echo "Setting up production environment..."
  APP_VARIANT=production yarn expo prebuild --clean
  echo "✅ Production environment ready for Sherpa Voice"
}

# Main execution logic
case $VARIANT in
  development)
    if [ "$FORCE" = "force" ] || [ ! -d "ios/SherpaVoiceDev.xcworkspace" ]; then
      setup_dev_environment
    else
      echo "✅ Development environment already set up"
    fi
    ;;
  production)
    if [ "$FORCE" = "force" ] || [ ! -d "ios/SherpaVoice.xcworkspace" ]; then
      setup_production_environment
    else
      echo "✅ Production environment already set up"
    fi
    ;;
  *)
    echo "Invalid environment: $VARIANT"
    echo "Usage: ./setup-env.sh [development|production] [force]"
    exit 1
    ;;
esac

exit 0
