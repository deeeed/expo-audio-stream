import { StyleSheet, Text, View } from 'react-native';

import * as ExpoAudioStream from 'expo-audio-stream';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>{ExpoAudioStream.hello()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
