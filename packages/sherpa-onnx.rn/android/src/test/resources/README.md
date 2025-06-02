# Android Test Resources

This directory contains test models and resources for Android native integration testing.

## Setup

To run the integration tests, you need to place test models in this directory:

```
android/src/test/resources/
├── tiny-kokoro/
│   ├── model.onnx
│   ├── tokens.txt
│   └── lexicon.txt
└── README.md
```

## Model Requirements

- **tiny-kokoro**: A small TTS model for testing basic functionality
  - Should be < 10MB for fast test execution
  - Must be compatible with sherpa-onnx format

## Usage in Tests

The test files will extract models from resources:

```kotlin
val inputStream = javaClass.classLoader.getResourceAsStream("tiny-kokoro/model.onnx")
val modelFile = File(context.cacheDir, "test_model.onnx")
inputStream.use { input ->
    modelFile.outputStream().use { output ->
        input.copyTo(output)
    }
}
```

## Notes

- Test models are not committed to git (add to .gitignore)
- Models should be downloaded/generated as part of test setup
- Use minimal models to keep test execution fast
- Android tests extract models to cache directory for testing