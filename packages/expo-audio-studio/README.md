# @siteed/expo-audio-studio (DEPRECATED)

This package has been renamed to **@siteed/audio-studio**.

Please update your dependencies:

```bash
# Remove the old package
npm uninstall @siteed/expo-audio-studio

# Install the new package
npm install @siteed/audio-studio
```

Then update your imports:

```diff
- import { ... } from '@siteed/expo-audio-studio';
+ import { ... } from '@siteed/audio-studio';
```

This shim package re-exports everything from `@siteed/audio-studio` for backwards compatibility, but will be removed in a future release.
