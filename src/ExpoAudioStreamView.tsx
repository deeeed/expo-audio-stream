import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';

import { ExpoAudioStreamViewProps } from './ExpoAudioStream.types';

const NativeView: React.ComponentType<ExpoAudioStreamViewProps> =
  requireNativeViewManager('ExpoAudioStream');

export default function ExpoAudioStreamView(props: ExpoAudioStreamViewProps) {
  return <NativeView {...props} />;
}
