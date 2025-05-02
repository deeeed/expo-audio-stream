# Publishing Guide

This document outlines my release and deployment process for AudioPlayground. It covers versioning, building, and submitting to app stores.

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
eas submit --platform ios --latest
```

## Over-the-Air Updates

For minor changes that don't require new native code, you can push OTA updates:

```bash
# Clean and reinstall dependencies
yarn clean
yarn install

# Push update
eas update --message "Description of the changes"
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
