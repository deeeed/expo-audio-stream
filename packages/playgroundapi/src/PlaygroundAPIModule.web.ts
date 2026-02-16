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

  // Add web implementations or stubs for the native methods
  async validateEssentiaIntegration() {
    return { success: false, message: 'Not supported on web' };
  }

  async validateAudioProcessorIntegration() {
    return { success: false, message: 'Not supported on web' };
  }

  async testEssentiaVersion() {
    return { success: false, error: 'Not supported on web' };
  }

  async checkModuleImports() {
    return { success: false, error: 'Not supported on web' };
  }

  async processAudioWithModule(fileUri: string) {
    return { success: false, error: 'Not supported on web' };
  }
}

export default registerWebModule(PlaygroundAPIModule);
