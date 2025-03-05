import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './PlaygroundAPI.types';

type PlaygroundAPIModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class PlaygroundAPIModule extends NativeModule<PlaygroundAPIModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(PlaygroundAPIModule);
