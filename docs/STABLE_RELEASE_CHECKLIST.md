# Stable Release Checklist

This checklist is the shared go/no-go gate for moving `@siteed/moonshine.rn`
and `@siteed/sherpa-onnx.rn` from beta to `latest`.

The intent is simple:

- keep package publication honest
- prove that external consumers can install and use the libraries
- separate "builds in the monorepo" from "works in a real client app"

## Current validated beta versions

- `@siteed/moonshine.rn@0.2.0-beta.2`
- `@siteed/sherpa-onnx.rn@1.1.3-beta.1`

## External validation baseline

Primary consumer validation app:

- `/tmp/demo-audiolab-beta-validate`

Known consumer assumptions validated there:

- Expo SDK 55
- Android `minSdkVersion 35`
- mixed Sherpa + Moonshine Android install
- Expo plugin path for Sherpa mixed-engine packaging
- Moonshine native model loading from Expo `file://` URIs

## Release gates

Mark each item before promoting a beta to `latest`.

### 1. Package publication

- [ ] npm package version exists under the intended tag
- [ ] `npm pack --json --dry-run` inspected for packed/unpacked size
- [ ] no accidental generated junk in tarball
- [ ] largest binary/model artifacts are intentional

### 2. Installability in external apps

- [ ] install from npm works in a clean external app
- [ ] Expo prebuild works without monorepo-only assumptions
- [ ] native autolinking/plugin setup is documented clearly
- [ ] strict package manager layouts are supported where claimed

### 3. Android

- [ ] documented `minSdkVersion` is accurate
- [ ] Android clean prebuild succeeds in external app
- [ ] Android clean `assembleDebug` succeeds in external app
- [ ] if Sherpa + Moonshine are used together, ORT alignment + packaging flow is validated
- [ ] one runtime smoke path succeeds on a physical device or emulator

### 4. iOS

- [ ] iOS clean prebuild succeeds in external app
- [ ] CocoaPods install succeeds
- [ ] iOS build smoke succeeds in external app
- [ ] one runtime smoke path succeeds on simulator or device

### 5. Web

- [ ] web install/setup path is documented
- [ ] one web smoke path succeeds in an external app where web is part of the supported story
- [ ] CDN / asset assumptions are documented clearly

### 6. Runtime UX

- [ ] one deterministic transcription path succeeds from consumer code
- [ ] one intent / secondary feature path succeeds from consumer code when applicable
- [ ] obvious integration traps discovered during beta are fixed in the library, not only in the demo app
- [ ] docs reflect real consumer code, not only playground helpers

### 7. Documentation quality

- [ ] install section matches the published beta behavior
- [ ] platform caveats are explicit
- [ ] mixed-engine constraints are explicit where relevant
- [ ] README examples avoid hidden monorepo assumptions

## Current status snapshot

### `@siteed/moonshine.rn`

Status: **beta-ready, not yet marked stable**

Validated recently:

- published as `0.2.0-beta.2`
- external Android install + prebuild + build succeeded
- runtime smoke in the external app succeeded:
  - platform check returned `android:true`
  - sample transcription completed and returned a non-empty transcript
- native loaders now accept Expo `file://` model paths

Known caveats:

- Android requires `minSdkVersion 35`
- package payload is still large because it ships real native artifacts
- stable release should still wait for broader external feedback, not just one demo app

### `@siteed/sherpa-onnx.rn`

Status: **beta-ready, not yet marked stable**

Validated recently:

- published as `1.1.3-beta.1`
- Expo config plugin now injects mixed-engine Android `pickFirsts`
- published package now includes the plugin dependency needed by strict dependency layouts
- Android build script now regenerates the nested `prebuilt/include` tree reproducibly
- mixed Sherpa + Moonshine Android external build succeeded

Known caveats:

- Android mixed-engine support still depends on matching ORT ABI between Sherpa and Moonshine
- stable release should wait for broader install/runtime feedback beyond the current demo app

## Recommended decision rule

Promote to `latest` only when:

1. all relevant gates above are checked
2. the published beta is the same artifact shape that was externally validated
3. no open beta feedback is pointing at setup/runtime traps for first-time users

If any of those is false, cut another beta instead of a stable release.
