import { MoonshineService } from './services/MoonshineService';

const moonshineService = new MoonshineService();

export default moonshineService;
export const Moonshine = moonshineService;

export {
  MoonshineIntentRecognizer,
  MoonshineService,
  MoonshineTranscriber,
} from './services/MoonshineService';
export * from './types/interfaces';
export * from './web/config';
