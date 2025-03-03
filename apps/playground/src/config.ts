import { getLogger } from '@siteed/react-native-logger'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

import { mobileTabletCheck } from './utils/utils'
import { WHISPER_MODELS, WEB_WHISPER_MODELS } from './hooks/useWhisperModels'

const baseUrl =
    Constants.expoConfig?.experiments?.baseUrl?.replace(/\/$/, '') ?? ''

const isMobileOrTablet = mobileTabletCheck()
export const WhisperSampleRate = 16000

// Helper function to get model capabilities
const getModelCapabilities = (modelId: string, isWeb: boolean) => {
    const models = isWeb ? WEB_WHISPER_MODELS : WHISPER_MODELS
    const model = models.find(m => m.id === modelId)
    return model?.capabilities || {
        multilingual: false,
        quantizable: false,
    }
}

// Web-specific model configuration
const defaultWebModel = WEB_WHISPER_MODELS[0].id
const webModelCapabilities = getModelCapabilities(defaultWebModel, true)

const webConfig = {
    DEFAULT_MODEL: defaultWebModel,
    DEFAULT_QUANTIZED: isMobileOrTablet && webModelCapabilities.quantizable,
    DEFAULT_MULTILINGUAL: webModelCapabilities.multilingual,
    MODELS: WEB_WHISPER_MODELS,
}

// Native-specific model configuration
const defaultNativeModel = WHISPER_MODELS[0].id
const nativeModelCapabilities = getModelCapabilities(defaultNativeModel, false)

const nativeConfig = {
    DEFAULT_MODEL: defaultNativeModel,
    DEFAULT_QUANTIZED: nativeModelCapabilities.quantizable,
    DEFAULT_MULTILINGUAL: nativeModelCapabilities.multilingual,
    MODELS: WHISPER_MODELS,
}

export const config = {
    baseUrl,
    audioWorkletUrl: `${baseUrl}/audioworklet.js`,
    featuresExtratorUrl: `${baseUrl}/audio-features-extractor.js`,
    whisperWorkerUrl: `${baseUrl}/whisperWorker.js`,
    DEFAULT_MODEL: Platform.OS === 'web' ? webConfig.DEFAULT_MODEL : nativeConfig.DEFAULT_MODEL,
    DEFAULT_SUBTASK: 'transcribe',
    DEFAULT_LANGUAGE: 'english',
    DEFAULT_QUANTIZED: Platform.OS === 'web' ? webConfig.DEFAULT_QUANTIZED : nativeConfig.DEFAULT_QUANTIZED,
    DEFAULT_MULTILINGUAL: Platform.OS === 'web' ? webConfig.DEFAULT_MULTILINGUAL : nativeConfig.DEFAULT_MULTILINGUAL,
    WHISPER_MODELS: Platform.OS === 'web' ? webConfig.MODELS : nativeConfig.MODELS,
    getModelCapabilities: (modelId: string) => getModelCapabilities(modelId, Platform.OS === 'web'),
}

export const baseLogger = getLogger('audio-playground')

// Define the audio class mapping
export const AUDIO_CLASSES: Record<number, string> = {
    0: 'Speech',
    1: 'Child speech, kid speaking',
    2: 'Conversation',
    3: 'Narration, monologue',
    4: 'Babbling',
    5: 'Speech synthesizer',
    6: 'Shout',
    7: 'Bellow',
    8: 'Whoop',
    9: 'Yell',
    10: 'Children shouting',
    11: 'Screaming',
    12: 'Whispering',
    13: 'Laughter',
    14: 'Baby laughter',
    15: 'Giggle',
    16: 'Snicker',
    17: 'Belly laugh',
    18: 'Chuckle, chortle',
    19: 'Crying, sobbing',
    20: 'Baby cry, infant cry',
    21: 'Whimper',
    22: 'Wail, moan',
    23: 'Sigh',
    24: 'Singing',
    25: 'Choir',
    26: 'Yodeling',
    27: 'Chant',
    28: 'Mantra',
    29: 'Child singing',
    30: 'Synthetic singing',
    31: 'Rapping',
    32: 'Humming',
    33: 'Groan',
    34: 'Grunt',
    35: 'Whistling',
    36: 'Breathing',
    37: 'Wheeze',
    38: 'Snoring',
    39: 'Gasp',
    40: 'Pant',
    41: 'Snort',
    42: 'Cough',
    43: 'Throat clearing',
    44: 'Sneeze',
    45: 'Sniff',
    46: 'Run',
    47: 'Shuffle',
    48: 'Walk, footsteps',
    49: 'Chewing, mastication',
    50: 'Biting',
    // Music categories
    132: 'Music',
    133: 'Musical instrument',
    134: 'Plucked string instrument',
    135: 'Guitar',
    136: 'Electric guitar',
    137: 'Bass guitar',
    138: 'Acoustic guitar',
    139: 'Steel guitar, slide guitar',
    140: 'Tapping (guitar technique)',
    141: 'Strum',
    142: 'Banjo',
    143: 'Sitar',
    144: 'Mandolin',
    145: 'Zither',
    146: 'Ukulele',
    147: 'Keyboard (musical)',
    148: 'Piano',
    149: 'Electric piano',
    150: 'Organ',
    151: 'Electronic organ',
    152: 'Hammond organ',
    153: 'Synthesizer',
    154: 'Sampler',
    155: 'Harpsichord',
    156: 'Percussion',
    157: 'Drum kit',
    158: 'Drum machine',
    159: 'Drum',
    160: 'Snare drum',
    // Environmental sounds
    277: 'Wind',
    278: 'Rustling leaves',
    279: 'Wind noise (microphone)',
    280: 'Thunderstorm',
    281: 'Thunder',
    282: 'Water',
    283: 'Rain',
    284: 'Raindrop',
    285: 'Rain on surface',
    286: 'Stream',
    287: 'Waterfall',
    288: 'Ocean',
    289: 'Waves, surf',
    290: 'Steam',
    291: 'Gurgling',
    292: 'Fire',
    293: 'Crackle',
    // Vehicle sounds
    294: 'Vehicle',
    295: 'Boat, Water vehicle',
    296: 'Sailboat, sailing ship',
    297: 'Rowboat, canoe, kayak',
    298: 'Motorboat, speedboat',
    299: 'Ship',
    300: 'Motor vehicle (road)',
    301: 'Car',
    302: 'Vehicle horn, car horn, honking',
    303: 'Toot',
    304: 'Car alarm',
    // Common sounds
    494: 'Silence',
    495: 'Sine wave',
    496: 'Harmonic',
    497: 'Chirp tone',
    498: 'Sound effect',
    499: 'Pulse',
    500: 'Inside, small room',
    501: 'Inside, large room or hall',
    502: 'Inside, public space',
    503: 'Outside, urban or manmade',
    504: 'Outside, rural or natural',
    505: 'Reverberation',
    506: 'Echo',
    507: 'Noise',
    508: 'Environmental noise',
    509: 'Static',
    510: 'Mains hum',
    511: 'Distortion',
    512: 'Sidetone',
    513: 'Cacophony',
    514: 'White noise',
    515: 'Pink noise',
    516: 'Throbbing',
    517: 'Vibration',
    518: 'Television',
    519: 'Radio',
    520: 'Field recording',
  };
  