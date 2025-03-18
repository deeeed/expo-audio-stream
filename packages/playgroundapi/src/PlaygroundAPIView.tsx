import { requireNativeView } from 'expo';
import * as React from 'react';

import { PlaygroundAPIViewProps } from './PlaygroundAPI.types';

const NativeView: React.ComponentType<PlaygroundAPIViewProps> =
  requireNativeView('PlaygroundAPI');

export default function PlaygroundAPIView(props: PlaygroundAPIViewProps) {
  return <NativeView {...props} />;
}
