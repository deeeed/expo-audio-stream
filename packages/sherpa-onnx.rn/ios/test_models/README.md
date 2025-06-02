# iOS Test Models

This directory contains test models for iOS native integration testing.

## Setup

To run the integration tests, you need to place test models in this directory:

```
ios/test_models/
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

The test files will look for models in this directory structure:

```swift
let modelPath = Bundle(for: type(of: self)).path(forResource: "tiny-kokoro/model", ofType: "onnx")
```

## Notes

- Test models are not committed to git (add to .gitignore)
- Models should be downloaded/generated as part of test setup
- Use minimal models to keep test execution fast