# Publishing Guide

This document outlines my release and deployment process for AudioPlayground. It covers versioning, building, and submitting to app stores.

## Current App Availability

AudioPlayground is publicly available on the following platforms:

| Platform | URL |
|----------|-----|
| App Store (iOS) | [https://apps.apple.com/app/audio-playground/id6739774966](https://apps.apple.com/app/audio-playground/id6739774966) |
| Google Play (Android) | [https://play.google.com/store/apps/details?id=net.siteed.audioplayground](https://play.google.com/store/apps/details?id=net.siteed.audioplayground) |
| Web | [https://deeeed.github.io/expo-audio-stream/playground/](https://deeeed.github.io/expo-audio-stream/playground/) |

When publishing updates, these are the destinations where the app will be updated.

## System Requirements

Before starting development or deployment, make sure your system has all the necessary dependencies installed:

```bash
# Check your system for all required dependencies
./scripts/check-system-dependencies.sh
```

This script checks for:
- Core development tools (Node.js, Yarn, Git, Watchman)
- Expo tools (Expo CLI, EAS CLI)
- Screenshot and image processing tools (ImageMagick)
- iOS development tools (Xcode, CocoaPods, Fastlane) when on macOS
- Android development tools (Android SDK, JDK)
- Web deployment tools

If any required dependencies are missing, the script will provide installation instructions.

## Versioning and Release Process

I follow semantic versioning (MAJOR.MINOR.PATCH) for releases:
- **PATCH**: Bug fixes and minor improvements (e.g., 1.0.1)
- **MINOR**: New features with backward compatibility (e.g., 1.1.0)
- **MAJOR**: Breaking changes or significant overhauls (e.g., 2.0.0)

## Interactive Deployment Script

For most deployment scenarios, I recommend using the interactive deployment script:

```bash
yarn publish
```

This script will:
1. Ask if you want to update the version number
2. Provide calculated version options (patch/minor/major)
3. Guide you through platform selection (Web/Android/iOS)
4. Handle the entire build and publishing workflow

## Manual Deployment Options

### Web Deployment

```bash
# Development environment
NODE_ENV=development APP_VARIANT=development EXPO_WEB=true expo export -p web && yarn serve dist/

# Production environment
NODE_ENV=production APP_VARIANT=production EXPO_WEB=true expo export -p web && cp playstore_policy.html dist/ && gh-pages -t -d dist --dest playground
```

### Android Deployment

#### Build Types

| Build Type | Use Case | Command |
|------------|----------|---------|
| Development | Local testing | `yarn build:android:development` |
| Preview | Testing distribution | `yarn build:android:preview` |
| Preview APK | Shareable APK | `yarn build:android:preview_apk` |
| Production | Store submission | `yarn build:android:production --local` |

#### Submitting to Play Store

```bash
# After local production build
eas submit --platform android --path "$(find . -maxdepth 1 -name "*.aab" -type f -print0 | xargs -0 ls -t | head -n1)"

# Build and submit automatically
yarn build:android:production --auto-submit
```

### iOS Deployment

#### Build Types

| Build Type | Use Case | Command |
|------------|----------|---------|
| Development | Testing on devices | `yarn build:ios:development` |
| Preview | TestFlight distribution | `yarn build:ios:preview` |
| Production | App Store submission | `yarn build:ios:production --local` |

#### Registering Test Devices

For development builds on iOS, you'll need to register test devices:
```bash
eas device:create
```

#### Submitting to App Store

```bash
# After local production build
(
  source .env.production && eas submit --platform ios \
    --path "$(find . -maxdepth 1 -name "*.ipa" -type f -print0 | xargs -0 ls -t | head -n1)"
)

# Build and submit automatically
yarn build:ios:production --auto-submit

# Submit latest build to App Store
npx eas submit --platform ios --latest
```

## Over-the-Air Updates

For minor changes that don't require new native code, you can push OTA updates:

```bash
# Clean and reinstall dependencies
yarn clean
yarn install

# Push update
npx eas update --message "Description of the changes"
```

> ⚠️ **Important**: OTA updates only work for builds using the same `runtimeVersion`

## CI/CD Pipeline

For automated builds in CI environments:

```bash
# Non-interactive version increment
yarn version --patch  # or --minor or --major

# Automated deployment
APP_VARIANT=production NODE_ENV=production eas build --platform all --profile production --non-interactive --auto-submit
```

## App Store Screenshots

Screenshots are required for App Store and Play Store submissions. Use our automated screenshot generation workflow for consistent, high-quality images.

### One-Stop App Store Preparation

For a complete App Store preparation workflow:

```bash
yarn prepare:appstore
```

This single command:
1. Sets up the production environment with the correct app name (if not already set up)
2. Creates required device simulators
3. Generates all screenshots for iPhone and iPad
4. Processes images for App Store submission

If you need to force a clean rebuild:
```bash
yarn prepare:appstore:force
```

### Screenshot Generation

The process involves these simple steps:

1. **Set up simulator devices** (first time only):
   ```bash
   ./scripts/setup-simulators.sh
   ```
   Creates required device simulators (iPhone 16 Pro Max, iPad Pro 13-inch M4).

2. **Generate screenshots**:
   Choose one of the following shortcut commands:
   ```bash
   # Generate screenshots for development build
   yarn screenshot:development
   
   # Generate screenshots for preview build
   yarn screenshot:preview
   
   # Generate screenshots for production build (App Store)
   yarn screenshot:production
   ```

   Each command automatically:
   - Checks if the correct environment is already set up (skips rebuild if possible)
   - Creates the proper native builds with the right app name (if needed)
   - Generates screenshots for all required devices
   - Processes images for store submission

   For a forced clean rebuild, use:
   ```bash
   # Force rebuild and generate screenshots
   yarn setup:production:force && yarn screenshot:production
   ```

### Behind the Scenes

These commands combine multiple steps for convenience:
```bash
# What happens with yarn screenshot:production
yarn setup:production                       # Prepares production environment
./scripts/generate-screenshots.sh all env=production  # Generates screenshots
```

You can still run individual steps if needed:
```bash
# Manual approach
yarn setup:production                      # Set up environment first
./scripts/generate-screenshots.sh ios      # iOS screenshots only
./scripts/generate-screenshots.sh android  # Android screenshots only
```

### Requirements

- iOS: macOS with Xcode, configured simulators
- Android: Configured emulators
- ImageMagick for image processing (`brew install imagemagick`)
