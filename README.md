# @siteed/expo-audio-stream

`@siteed/expo-audio-stream` is a comprehensive library designed to facilitate real-time audio processing and streaming across iOS, Android, and web platforms. This library leverages Expo's robust ecosystem to simplify the implementation of audio recording and streaming functionalities within React Native applications. Key features include audio streaming with configurable buffer intervals and automatic handling of microphone permissions in managed Expo projects.

## Features

- Real-time audio streaming across iOS, Android, and web.
- Configurable intervals for audio buffer receipt.
- Automated microphone permissions setup in managed Expo projects.
- IOS is automatically setup to handle background audio recording.
- Listeners for audio data events with detailed event payloads.
- Utility functions for recording control and file management.

## Installation

To install `@siteed/expo-audio-stream`, add it to your project using npm or Yarn:

```bash
npm install @siteed/expo-audio-stream
# or
yarn add @siteed/expo-audio-stream
```

Make sure that you have Expo set up in your project. For details on setting up Expo, refer to the Expo documentation.

### Configuring with app.json

To ensure expo-audio-stream works correctly with Expo, you must add it as a plugin in your app.json configuration file. This step is crucial as it allows Expo to load any necessary configurations or permissions required by the library.

Add the plugin to your app.json like so:

```json
{
  "expo": {
    "plugins": ["@siteed/expo-audio-stream"]
  }
}
```

## Usage

The `example/` folder contains a fully functional React Native application that demonstrates how to integrate and use the `@siteed/expo-audio-stream` library in a real-world scenario. This sample application includes features such as starting and stopping audio recordings, handling permissions, and processing live audio data.

### Importing the module

```tsx
import {
  useAudioRecorder,
  AudioStreamResult,
} from 'expo-audio-stream';

export default function App() {
  const { startRecording, stopRecording, duration, size, isRecording } = useAudioRecorder({
    onAudioStream: (audioData: Blob) => {
      console.log(`audio event`,audioData);
    }
  });

  const handleStart = async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (granted) {
      const fileUri = await startRecording({interval: 500});
    }
  };

  const handleStop = async () => {
    const result: AudioStreamResult = await stopRecording();
  };

  const renderRecording = () => (
    <View>
      <Text>Duration: {duration} ms</Text>
      <Text>Size: {size} bytes</Text>
      <Button title="Stop Recording" onPress={handleStop} />
    </View>
  );

  const renderStopped = () => (
    <View>
      <Button title="Start Recording" onPress={handleStart} />
    </View>
  );

  return (
    <View>
      <Button title="Request Permission" onPress={() => Audio.requestPermissionsAsync()} />
      {isRecording ? renderRecording() : renderStopped()}
    </View>
  );
}
```

The library also exposes an `addAudioEventListener` function that provides an `AudioEventPayload` object that you can subscribe to:
```tsx
export interface AudioEventPayload {
  encoded?: string, 
  buffer?: Blob,
  fileUri: string,
  from: number,
  deltaSize: number,
  totalSize: number,
  mimeType: string;
  streamUuid: string,
};

  useEffect(() => {
    const subscribe = addAudioEventListener(async ({fileUri, deltaSize, totalSize, from, streamUuid, encoded, mimeType, buffer}) => {
        log(`Received audio event:`, {fileUri, deltaSize, totalSize, mimeType, from, streamUuid, encodedLength: encoded?.length})
        if(deltaSize > 0) {
            // Coming from native ( ios / android ) otherwise buffer is set
              if(Platform.OS !== 'web') {
                // Read the audio file as a base64 string for comparison
                try {
                    // convert encoded string to binary data
                    const binaryData = atob(encoded);
                    const content = new Uint8Array(binaryData.length);
                    for (let i = 0; i < binaryData.length; i++) {
                        content[i] = binaryData.charCodeAt(i);
                    }
                    const audioBlob = new Blob([content], { type: mimeType });
                    console.info(`Received audio blob:`, audioBlob);
                } catch (error) {
                    console.error('Error reading audio file:', error);
                }
            } else if(buffer) {
                // Coming from web
                console.info(`Received audio buffer:`, buffer)
            }
        }
    });
    return () => subscribe.remove();
  }, []);
```

### Recording configuration

- on Android and IOS, audio is recorded in wav format, 16khz sample rate, 16 bit depth, 1 channel.
- on web, it usually records in opus  but it depends on the browser configuration.

If you want to process the audio livestream directly, I recommend having another encoding step to align the audio format across platforms.


### Debug Configuration

This library uses the npm `debug` package, to enable logging you can:
```
localStorage.debug = 'expo-audio-stream:*'
```
or set the DEBUG environment variable to `expo-audio-stream:*`

### TODO
this package is still in development, and there are a few things that need to be done:
- add multiple format for native audio stream (wav, mp3, opus)

