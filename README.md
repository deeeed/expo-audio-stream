# expo-audio-stream

`@siteed/expo-audio-stream` is a comprehensive library designed to facilitate real-time audio processing and streaming across iOS, Android, and web platforms. This library leverages Expo's robust ecosystem to simplify the implementation of audio recording and streaming functionalities within React Native applications. Key features include audio streaming with configurable buffer intervals and automatic handling of microphone permissions in managed Expo projects.

## Features

- Real-time audio streaming across iOS, Android, and web.
- Configurable intervals for audio buffer receipt.
- Automated microphone permissions setup in managed Expo projects.
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


## Usage

### Importing the module

```tsx
import {
  useAudioRecorder,
} from 'expo-audio-stream';

export default function App() {
  const { startRecording, stopRecording, duration, size, isRecording } = useAudioRecorder({
    onAudioStream: (base64Data) => {
      console.log(`audio event ${typeof base64Data}`, base64Data);
    }
  });

  const handleStart = async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (granted) {
      startRecording({interval: 500});
    }
  };

  const renderRecording = () => (
    <View>
      <Text>Duration: {duration} ms</Text>
      <Text>Size: {size} bytes</Text>
      <Button title="Stop Recording" onPress={stopRecording} />
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

