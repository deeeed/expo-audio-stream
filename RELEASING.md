# Releasing

## @siteed/audio-studio

Run `yarn release` from `packages/audio-studio/`. The script will guide you through:
1. Lint + build
2. Version bump + npm publish (@siteed/audio-studio)
3. **Publish the compatibility shim** (@siteed/expo-audio-studio) — always say Y here
4. Docs generation (optional)
5. Playground app deploy (optional)

## Shim policy
The `@siteed/expo-audio-studio` shim re-exports everything from `@siteed/audio-studio`.
It must be published on every audio-studio release with a matching version number.
The shim will be deprecated via `npm deprecate` once migration adoption is high enough.
