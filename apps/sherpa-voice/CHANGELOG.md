# Changelog

All notable changes to Sherpa Voice will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- EAS build configuration with development and production profiles
- Expo Updates (OTA) with per-channel updates (development / production)
- Dev/prod app variants: SherpaVoiceDev (`net.siteed.sherpavoice.development`) / Sherpa Voice (`net.siteed.sherpavoice`)
- Environment validation with dotenv-flow and joi
- Build scripts: `build:ios:*`, `build:android:*`, `ota-update:*`, `setup:*`
- `suppress-onboarding` CDP command in device-cmd.sh (works on physical devices)
- `setup-env.sh` for switching between dev/prod iOS workspaces
- App Store readiness: `ITSAppUsesNonExemptEncryption`, `useLegacyPackaging`, `silentLaunch`
- `expo-updates` dependency for runtime OTA support
- APPLE_TEAM_ID support for automatic code signing

### Changed
- Renamed from sherpa-onnx-demo to sherpa-voice (full rebrand)
- App config rewritten from static to variant-aware dynamic config
- Default bundle ID in agentic scripts updated to `.development` suffix
- Cleaned up `.gitignore` (removed duplicated expo-cli block, added build artifacts)
- `open:ios` script now targets variant-specific workspace name
- Use `streamFormat: 'float32'` in all live-mic consumers (ASR, VAD, KWS, language-id) for zero base64 overhead
