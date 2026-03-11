# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]
### Changed
- feat(sherpa-onnx-demo): use `streamFormat: 'float32'` in all live-mic consumers (ASR, VAD, KWS, language-id) — eliminates base64 overhead on native bridge
