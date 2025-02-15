### Building with EAS

The project includes several build profiles that align with our environment configurations:

#### Android Builds
```bash
# Local Development Build (debug APK)
yarn build:android:development

# Local Preview Build (optimized, unsigned APK)
yarn build:android:preview

# Local Production Build (optimized, signed APK)
yarn build:android:production --local
# To submit manually after a local build
eas submit --platform android --path "$(find . -maxdepth 1 -name "*.aab" -type f -print0 | xargs -0 ls -t | head -n1)"

# Remote Production Build + Auto Submit to Play Store
yarn build:android:production --auto-submit
```

#### iOS Builds
```bash
# Local Development Build (for registered devices)
eas device:create # Register test devices first
yarn build:ios:development

# Local Preview Build (simulator/TestFlight)
yarn build:ios:preview

# Local Production Build
yarn build:ios:production --local
# To submit manually after a local build (keep within paranthesis to avoid leaking env variables)
(
  source .env.production && eas submit --platform ios \
    --path "$(find . -maxdepth 1 -name "*.ipa" -type f -print0 | xargs -0 ls -t | head -n1)"
)

# Remote Production Build + Auto Submit to App Store
yarn build:ios:production --auto-submit
```

Note: Remote builds (with --auto-submit) require proper store credentials and must be run on EAS servers.


### Publishing Updates

To push updates without rebuilding:
```bash
# First, clean the project
yarn clean

# Then reinstall dependencies
yarn install

# Push update to production
yarn update-production --message "new update"

```

Note: Updates only work for builds using the same `runtimeVersion`
