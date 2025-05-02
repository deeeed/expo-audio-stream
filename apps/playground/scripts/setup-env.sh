#!/bin/bash

# This script sets up the development environment with the appropriate app variant
# Usage: ./setup-env.sh [development|preview|production] [force]

# Default values
VARIANT=${1:-development}
FORCE=${2:-no}

# Function to setup dev environment
setup_dev_environment() {
  echo "Setting up development environment..."
  APP_VARIANT=development yarn expo prebuild --clean
  echo "✅ Development environment ready for AudioDevPlayground"
}

# Function to setup preview environment
setup_preview_environment() {
  echo "Setting up preview environment..."
  APP_VARIANT=preview yarn expo prebuild --clean
  echo "✅ Preview environment ready for AudioDevPlayground"
}

# Function to setup production environment
setup_production_environment() {
  echo "Setting up production environment..."
  APP_VARIANT=production yarn expo prebuild --clean
  echo "✅ Production environment ready for AudioPlayground"
}

# Main execution logic
case $VARIANT in
  development)
    if [ "$FORCE" = "force" ] || [ ! -d "ios/AudioDevPlayground.xcworkspace" ]; then
      setup_dev_environment
    else
      echo "✅ Development environment already set up"
    fi
    ;;
  preview)
    if [ "$FORCE" = "force" ] || [ ! -d "ios/AudioDevPlayground.xcworkspace" ]; then
      setup_preview_environment
    else
      echo "✅ Preview environment already set up"
    fi
    ;;
  production)
    if [ "$FORCE" = "force" ] || [ ! -d "ios/AudioPlayground.xcworkspace" ]; then
      setup_production_environment
    else
      echo "✅ Production environment already set up"
    fi
    ;;
  *)
    echo "Invalid environment: $VARIANT"
    echo "Usage: ./setup-env.sh [development|preview|production] [force]"
    exit 1
    ;;
esac

exit 0 