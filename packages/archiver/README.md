# @siteed/archiver

Cross-platform archiving library for Expo, React Native, and web applications. Supports various archive formats including zip, tar, tar.gz, and tar.bz2.

## Features

- 📱 Works on Android, iOS, and web platforms
- 📦 Supports multiple archive formats (zip, tar, tar.gz, tar.bz2)
- 🔄 Create and extract archives with a unified API
- 📂 Extract single files or entire archives
- 🛠️ Extensible architecture for custom implementations

## Platform-Specific Implementations

- **Web**: Uses jszip and js-untar libraries (loaded dynamically)
- **Android**: Uses Apache Commons Compress for all archive formats
- **iOS**: Uses libarchive, compiled as a native module

## Installation

```sh
# Using npm
npm install @siteed/archiver

# Using yarn
yarn add @siteed/archiver
```

## Platform-specific dependencies

### Android

Apache Commons Compress will be automatically added to your Android project through the package's Gradle configuration.

### iOS

libarchive is included as a compiled XCFramework in the package.

## Usage

```typescript
import { archiver } from '@siteed/archiver';

// List supported formats
const formats = await archiver.supportedFormats();
console.log(`Supported formats: ${formats.join(', ')}`);

// Create a new archive
await archiver.create('example.zip', 'zip');

// Add files to it
const textEncoder = new TextEncoder();
await archiver.addEntry({
  name: 'hello.txt',
  isDirectory: false,
  data: textEncoder.encode('Hello World!').buffer,
});

// Finalize the archive
await archiver.finalize();

// Open an existing archive
await archiver.open('example.zip');

// Extract all entries
let entry;
while ((entry = await archiver.getNextEntry()) !== null) {
  await archiver.extractEntry(entry, './output');
}

// Close the archive
await archiver.close();
```

## Development Setup

### Prerequisites

- Node.js and yarn
- XCode and Command Line Tools (for iOS)
- Android Studio and SDK (for Android)
- CMake and Make

### Setup

Run the setup script to prepare the development environment:

```sh
chmod +x setup.sh
./setup.sh
```

This will:
1. Clone the libarchive repository (v3.7.8) from GitHub
2. Build libarchive for iOS (on macOS) and create an XCFramework
3. Install Node.js dependencies
4. Set up the example project
5. Build the TypeScript code

The setup script handles all the necessary build steps, including compiling libarchive for iOS (when run on macOS).

### Building

If you need to rebuild just the TypeScript code:

```sh
chmod +x build-all.sh
./build-all.sh
```

### Running the Example

```sh
cd example
yarn prebuild  # Generate native code
yarn ios      # Run on iOS
yarn android  # Run on Android
yarn web      # Run on web
```

## API

The library provides a consistent API across all platforms:

```typescript
// Main interface
export interface ArchiveHandler {
  open(source: string, format?: string): Promise<void>;
  getNextEntry(): Promise<ArchiveEntry | null>;
  extractEntry(entry: ArchiveEntry, destination: string): Promise<void>;
  close(): Promise<void>;
  create(destination: string, format: string): Promise<void>;
  addEntry(entry: ArchiveEntry): Promise<void>;
  finalize(): Promise<void>;
  supportedFormats(): Promise<string[]>;
}

// Entry in an archive
export interface ArchiveEntry {
  name: string;
  isDirectory: boolean;
  size?: number;
  data?: ArrayBuffer;
}
```

## License

MIT

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
