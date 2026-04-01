export interface AsrSampleAudioAsset {
    id: string
    name: string
    module: number
}

export const SAMPLE_AUDIO_FILES: AsrSampleAudioAsset[] = [
    {
        id: '1',
        name: 'JFK Speech Extract',
        module: require('@assets/audio/jfk.wav'),
    },
    {
        id: '2',
        name: 'Random English Voice',
        module: require('@assets/audio/en.wav'),
    },
]
