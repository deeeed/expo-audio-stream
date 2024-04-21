import { Audio } from 'expo-av';
import { Button, StyleSheet, Text, View } from 'react-native';

import { clearAudioFiles, listAudioFiles, useAudioRecorder } from 'expo-audio-stream';

export default function App() {
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  const onAudioData = (base64Data: Blob) => {
    console.log(`audio event ${typeof base64Data}`, base64Data);
  }

  const { startRecording, stopRecording, duration, size, isRecording } = useAudioRecorder({onAudioStream: onAudioData});


  const handleStart = async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    startRecording({interval: 500});
  }

  const handleListFiles = async () => {
    const files = await listAudioFiles();
    console.log(`files`, files);
  }

  const renderRecording = () => (
    <View>
      <Text>Duration: {duration} ms</Text>
      <Text>Size: {size} bytes</Text>
      <Button title="Stop Recording" onPress={() => stopRecording()} />
    </View>
  );

  const renderStopped = () => (
    <View>
      <Button title="Start Recording" onPress={() => handleStart()} />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={{gap: 10}}>
        <Button title="Request Permission" onPress={requestPermission} />
        <Button title="List Files" onPress={handleListFiles} />
        <Button title="Clear Storage" onPress={clearAudioFiles} />
      </View>
      {isRecording && renderRecording()}
      {!isRecording && renderStopped()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
