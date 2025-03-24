# Demo App for Sherpa-ONNX Models

## Instructions
# 1. First, run the setPort script to ensure all files are updated
chmod +x setPort.sh
./setPort.sh

# 2. Kill any existing Metro processes
killall -9 node

# 3. Reverse the ADB port
adb reverse tcp:7500 tcp:7500

# 4. Start the Metro bundler with your custom port
yarn start


## Summary of Language Models for Sherpa-ONNX Workflows

This document provides a curated list of pre-trained models for Sherpa-ONNX, covering all main workflows: Speech Recognition (ASR), Text-to-Speech (TTS), Voice Activity Detection (VAD), Keyword Spotting, Speaker Identification, Spoken Language Identification, Audio Tagging, and Punctuation. The selections include both mobile-optimized and larger models to showcase the full capabilities of Sherpa-ONNX in your wrapper application, allowing users to choose based on their needs.

---

### 1. Speech Recognition (Speech to Text, ASR)
**Category Description:** Converts spoken language into text, with options for streaming (real-time) and offline use.  
**Full List:** [https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models](https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models)

- **Streaming Model (English, Mobile-Optimized)**  
  - **URL:** [sherpa-onnx-streaming-zipformer-en-20M-2023-02-17-mobile.tar.bz2](https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-zipformer-en-20M-2023-02-17-mobile.tar.bz2)  
  - **Size:** 103 MB  
  - **Description:** Compact streaming model for real-time English transcription, optimized for mobile devices.

- **Streaming Model (English, General Purpose)**  
  - **URL:** [sherpa-onnx-streaming-zipformer-en-2023-06-26.tar.bz2](https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-zipformer-en-2023-06-26.tar.bz2)  
  - **Size:** 296 MB  
  - **Description:** Versatile streaming model for real-time English transcription, larger but usable on modern mobile devices.

- **Offline Model (English, Beginner-Friendly)**  
  - **URL:** [sherpa-onnx-whisper-tiny.en.tar.bz2](https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-tiny.en.tar.bz2)  
  - **Size:** 113 MB  
  - **Description:** Small, offline English model based on Whisper, ideal for mobile testing with pre-recorded audio.

- **Multi-lingual Model (Offline)**  
  - **URL:** [sherpa-onnx-whisper-small.tar.bz2](https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-small.tar.bz2)  
  - **Size:** 610 MB  
  - **Description:** Offline model supporting multiple languages, useful for testing multi-lingual ASR capabilities.

---

### 2. Text-to-Speech (TTS)
**Category Description:** Converts text into spoken audio, requiring a vocoder for synthesis.  
**Full List:** [https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models](https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models)

- **TTS Model (English, Low Quality, Mobile)**  
  - **URL:** [vits-icefall-en_US-ljspeech-low.tar.bz2](https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-icefall-en_US-ljspeech-low.tar.bz2)  
  - **Size:** 30.3 MB  
  - **Description:** Tiny, low-quality English model optimized for mobile devices with minimal resource usage.

- **TTS Model (English, Medium Quality)**  
  - **URL:** [vits-piper-en_US-ljspeech-medium.tar.bz2](https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_US-ljspeech-medium.tar.bz2)  
  - **Size:** 64.1 MB  
  - **Description:** Compact medium-quality model for American English, balancing size and clarity for mobile apps.

- **TTS Model (English, High Quality)**  
  - **URL:** [vits-piper-en_US-libritts-high.tar.bz2](https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_US-libritts-high.tar.bz2)  
  - **Size:** 125 MB  
  - **Description:** High-fidelity English model, manageable on modern mobile devices for premium voice output.

- **Kokoro Model (English, Expressive)**  
  - **URL:** [kokoro-en-v0_19.tar.bz2](https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-en-v0_19.tar.bz2)  
  - **Size:** 305 MB  
  - **Description:** Expressive synthesis model, larger but suitable for high-end devices needing unique voice capabilities. Requires specific parameters for expressive control.

- **Matcha Model (English, Efficient)**  
  - **URL:** [matcha-icefall-en_US-ljspeech.tar.bz2](https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/matcha-icefall-en_US-ljspeech.tar.bz2)  
  - **Size:** 73.2 MB  
  - **Description:** Efficient and clear synthesis model, a modern alternative to VITS, mobile-friendly with distinct parameter requirements.

- **Vocoder Model (Required for TTS)**  
  - **URL:** [vocos-22khz-univ.onnx](https://github.com/k2-fsa/sherpa-onnx/releases/download/vocoder-models/vocos-22khz-univ.onnx)  
  - **Size:** ~10 MB (estimated)  
  - **Description:** Universal vocoder required for audio synthesis with TTS models. Download separately.

---

### 3. Voice Activity Detection (VAD)
**Category Description:** Detects speech segments in audio streams.  
**Full List:** Part of ASR models release.

- **Model:**  
  - **URL:** [silero_vad_v5.onnx](https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad_v5.onnx)  
  - **Size:** 2.21 MB  
  - **Description:** Latest version of the Silero VAD model, lightweight and efficient for mobile use.

---

### 4. Keyword Spotting
**Category Description:** Identifies specific keywords in audio streams.  
**Full List:** [https://github.com/k2-fsa/sherpa-onnx/releases/tag/kws-models](https://github.com/k2-fsa/sherpa-onnx/releases/tag/kws-models)

- **Mobile-Optimized Model (GigaSpeech)**  
  - **URL:** [sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01-mobile.tar.bz2](https://github.com/k2-fsa/sherpa-onnx/releases/download/kws-models/sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01-mobile.tar.bz2)  
  - **Size:** 14.9 MB  
  - **Description:** Optimized for mobile, trained on GigaSpeech data.

- **General Model (Wenetspeech)**  
  - **URL:** [sherpa-onnx-kws-zipformer-wenetspeech-3.3M-2024-01-01.tar.bz2](https://github.com/k2-fsa/sherpa-onnx/releases/download/kws-models/sherpa-onnx-kws-zipformer-wenetspeech-3.3M-2024-01-01.tar.bz2)  
  - **Size:** 16.8 MB  
  - **Description:** General-purpose model trained on Wenetspeech data, slightly larger but still compact.

---

### 5. Speaker Identification (Speaker ID)
**Category Description:** Identifies speakers based on voice characteristics.  
**Full List:** [https://github.com/k2-fsa/sherpa-onnx/releases/tag/speaker-recongition-models](https://github.com/k2-fsa/sherpa-onnx/releases/tag/speaker-recongition-models)

- **English Model (VoxCeleb)**  
  - **URL:** [3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx](https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx)  
  - **Size:** 28.2 MB  
  - **Description:** Compact model for English speaker verification.

- **Chinese Model**  
  - **URL:** [3dspeaker_speech_campplus_sv_zh-cn_16k-common.onnx](https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/3dspeaker_speech_campplus_sv_zh-cn_16k-common.onnx)  
  - **Size:** 27 MB  
  - **Description:** Model for Chinese speaker verification, similar in size and suitable for mobile.

- **Advanced Model (Multi-lingual)**  
  - **URL:** [3dspeaker_speech_campplus_sv_zh_en_16k-common_advanced.onnx](https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/3dspeaker_speech_campplus_sv_zh_en_16k-common_advanced.onnx)  
  - **Size:** 27 MB  
  - **Description:** Advanced model supporting both Chinese and English, compact and versatile.

---

### 6. Spoken Language Identification (Language ID)
**Category Description:** Identifies the language spoken in audio.  
**Full List:** Part of ASR models release (multi-lingual Whisper models).

- **Multi-lingual Model (Tiny)**  
  - **URL:** [sherpa-onnx-whisper-tiny.tar.bz2](https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-tiny.tar.bz2)  
  - **Size:** 111 MB  
  - **Description:** Compact multi-lingual model for language identification and transcription.

- **Multi-lingual Model (Small)**  
  - **URL:** [sherpa-onnx-whisper-small.tar.bz2](https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-small.tar.bz2)  
  - **Size:** 610 MB  
  - **Description:** Larger model with better accuracy for multiple languages.

---

### 7. Audio Tagging
**Category Description:** Classifies audio events or sounds.  
**Full List:** [https://github.com/k2-fsa/sherpa-onnx/releases/tag/audio-tagging-models](https://github.com/k2-fsa/sherpa-onnx/releases/tag/audio-tagging-models)

- **Tiny Model**  
  - **URL:** [sherpa-onnx-ced-tiny-audio-tagging-2024-04-19.tar.bz2](https://github.com/k2-fsa/sherpa-onnx/releases/download/audio-tagging-models/sherpa-onnx-ced-tiny-audio-tagging-2024-04-19.tar.bz2)  
  - **Size:** 27.2 MB  
  - **Description:** Very small model for basic audio tagging, highly mobile-optimized.

- **Mini Model**  
  - **URL:** [sherpa-onnx-ced-mini-audio-tagging-2024-04-19.tar.bz2](https://github.com/k2-fsa/sherpa-onnx/releases/download/audio-tagging-models/sherpa-onnx-ced-mini-audio-tagging-2024-04-19.tar.bz2)  
  - **Size:** 45.5 MB  
  - **Description:** Slightly larger with better performance for audio event detection.

- **Base Model**  
  - **URL:** [sherpa-onnx-ced-base-audio-tagging-2024-04-19.tar.bz2](https://github.com/k2-fsa/sherpa-onnx/releases/download/audio-tagging-models/sherpa-onnx-ced-base-audio-tagging-2024-04-19.tar.bz2)  
  - **Size:** 369 MB  
  - **Description:** Full base model for comprehensive audio tagging, less suitable for mobile but good for testing.

---

### 8. Punctuation
**Category Description:** Adds punctuation to transcribed text.  
**Full List:** [https://github.com/k2-fsa/sherpa-onnx/releases/tag/punctuation-models](https://github.com/k2-fsa/sherpa-onnx/releases/tag/punctuation-models)

- **English Model**  
  - **URL:** [sherpa-onnx-online-punct-en-2024-08-06.tar.bz2](https://github.com/k2-fsa/sherpa-onnx/releases/download/punctuation-models/sherpa-onnx-online-punct-en-2024-08-06.tar.bz2)  
  - **Size:** 29.2 MB  
  - **Description:** Online punctuation model for English text, lightweight and suitable for mobile.

