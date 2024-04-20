import * as React from 'react';

import { ExpoAudioStreamViewProps } from './ExpoAudioStream.types';

export default function ExpoAudioStreamView(props: ExpoAudioStreamViewProps) {
  return (
    <div>
      <span>{props.name}</span>
    </div>
  );
}
