import React from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';

interface WebInfoBannerProps {
  visible?: boolean;
}

const WebInfoBanner: React.FC<WebInfoBannerProps> = ({ visible = true }) => {
  if (!visible || Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.warningText}>
        Model Management Limitations on Web
      </Text>
      <Text style={styles.infoText}>
        On the web platform:
      </Text>
      <View style={styles.bulletPoints}>
        <Text style={styles.bulletPoint}>• Model downloads are not available</Text>
        <Text style={styles.bulletPoint}>• File browsing is disabled</Text>
        <Text style={styles.bulletPoint}>• Only pre-compiled models can be used</Text>
        <Text style={styles.bulletPoint}>• A default TTS model is automatically provided</Text>
      </View>
      <Text style={styles.noteText}>
        To use custom models, you must compile them into the web build during development.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF8E1',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB300',
  },
  warningText: {
    color: '#FF9800',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 8,
  },
  bulletPoints: {
    marginLeft: 4,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 4,
  },
  noteText: {
    fontStyle: 'italic',
    fontSize: 13,
    color: '#757575',
    textAlign: 'center',
  }
});

export default WebInfoBanner; 