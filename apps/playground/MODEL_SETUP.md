# Whisper Model Setup

Before running the application, you'll need to download the required Whisper model files.

1. Create an `assets` directory in `apps/playground/assets` if it doesn't exist.

2. Download the standard Whisper models:
   - Download [ggml-tiny.en.bin](https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin)
   - Download [ggml-base.bin](https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin)
   
3. Download the TDRZ model:
   - Download [ggml-small.en-tdrz.bin](https://huggingface.co/akashmjn/tinydiarize-whisper.cpp/blob/main/ggml-small.en-tdrz.bin)

4. Place all downloaded `.bin` files in the `apps/playground/assets` directory.

## Model Sizes
- ggml-tiny.en.bin: ~75MB
- ggml-base.bin: ~142MB
- ggml-small.en-tdrz.bin: ~466MB

Note: These models are required for the speech recognition functionality to work. 