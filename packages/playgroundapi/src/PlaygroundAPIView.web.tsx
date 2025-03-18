import * as React from 'react';

import { PlaygroundAPIViewProps } from './PlaygroundAPI.types';

export default function PlaygroundAPIView(props: PlaygroundAPIViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
