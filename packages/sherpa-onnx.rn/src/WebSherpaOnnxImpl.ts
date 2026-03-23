import type { ApiInterface } from './types/api';
import { DiagnosticsMixin } from './web/features/diagnostics';
import { TtsMixin } from './web/features/tts';
import { VadMixin } from './web/features/vad';
import { AsrMixin } from './web/features/asr';
import { KwsMixin } from './web/features/kws';
import { AudioTaggingMixin } from './web/features/audioTagging';
import { SpeakerIdMixin } from './web/features/speakerId';
import { DiarizationMixin } from './web/features/diarization';
import { LanguageIdMixin } from './web/features/languageId';
import { PunctuationMixin } from './web/features/punctuation';
import { DenoisingMixin } from './web/features/denoising';

// Re-export types used by wasmLoader for global window augmentation
export type {} from './web/wasmTypes';

const WebComposed = TtsMixin(
  VadMixin(
    AsrMixin(
      KwsMixin(
        AudioTaggingMixin(
          SpeakerIdMixin(
            DiarizationMixin(
              LanguageIdMixin(
                PunctuationMixin(
                  DenoisingMixin(
                    DiagnosticsMixin(class {})
                  )
                )
              )
            )
          )
        )
      )
    )
  )
);

export class WebSherpaOnnxImpl extends WebComposed implements ApiInterface {
  async createOnnxSession(): Promise<{ success: boolean; sessionId: string; inputNames: string[]; outputNames: string[]; error?: string }> {
    return { success: false, sessionId: '', inputNames: [], outputNames: [], error: 'ONNX inference via sherpa-onnx is not needed on web. Use onnxruntime-web directly.' };
  }
  async runOnnxSession(): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'ONNX inference via sherpa-onnx is not needed on web.' };
  }
  async releaseOnnxSession(): Promise<{ released: boolean }> {
    return { released: false };
  }
}
