import { Platform } from 'react-native'

export type AsrBenchmarkTier =
    | 'live-mobile'
    | 'live-general'
    | 'live-recent'
    | 'offline-baseline'
    | 'offline-reference'
    | 'offline-translation-reference'

export interface AsrBenchmarkMatrixEntry {
    id: string
    liveCapable: boolean
    platforms?: Array<'android' | 'ios' | 'web'>
    rationale: string
    tier: AsrBenchmarkTier
}

export const ASR_BENCHMARK_MATRIX: AsrBenchmarkMatrixEntry[] = [
    {
        id: 'streaming-zipformer-en-20m-mobile',
        tier: 'live-mobile',
        liveCapable: true,
        rationale: 'Compact streaming baseline for phones. Included even if it loses on quality.',
    },
    {
        id: 'streaming-zipformer-en-general',
        tier: 'live-general',
        liveCapable: true,
        rationale: 'Current practical live baseline already in the repo.',
    },
    {
        id: 'streaming-zipformer-ctc-small-2024-03-18',
        tier: 'live-general',
        liveCapable: true,
        rationale: 'Upstream streaming CTC candidate added because the transducer-only live matrix was too narrow.',
    },
    {
        id: 'streaming-zipformer-bilingual-zh-en-2023-02-20',
        tier: 'live-general',
        liveCapable: true,
        rationale: 'Older bilingual streaming model included to check whether English-only assumptions hide a better live fallback.',
    },
    {
        id: 'streaming-paraformer-bilingual-zh-en',
        tier: 'live-general',
        liveCapable: true,
        rationale: 'Large upstream streaming Paraformer candidate added because the live Sherpa matrix should not stop at Zipformer variants.',
    },
    {
        id: 'streaming-zipformer-en-kroko-2025-08-06',
        tier: 'live-recent',
        liveCapable: true,
        rationale: 'Newer upstream streaming candidate to test whether recent releases improve live UX.',
    },
    {
        id: 'whisper-tiny-en',
        tier: 'offline-baseline',
        liveCapable: false,
        rationale: 'Small offline English baseline. Fast enough to keep as a non-winner comparison point.',
    },
    {
        id: 'whisper-small-multilingual',
        tier: 'offline-reference',
        liveCapable: false,
        rationale: 'Heavier offline multilingual reference for transcript quality.',
    },
    {
        id: 'sense-voice-zh-en-ja-ko-yue-int8-2025-09-09',
        tier: 'offline-reference',
        liveCapable: false,
        rationale: 'Broader multilingual ASR reference to compare practical live models against.',
    },
    {
        id: 'zipformer-en-general',
        tier: 'offline-reference',
        liveCapable: false,
        rationale: 'Non-streaming Zipformer reference to separate streaming limitations from Sherpa runtime quality on-device.',
    },
    {
        id: 'nemo-canary-180m-flash-en-es-de-fr',
        tier: 'offline-translation-reference',
        liveCapable: false,
        platforms: ['android', 'web'],
        rationale: 'Translation-capable offline reference. Useful for feasibility, not for Recorder-like live UX.',
    },
]

export const ASR_BENCHMARK_MODEL_IDS = ASR_BENCHMARK_MATRIX.map(
    (entry) => entry.id
)

export function getAsrBenchmarkEntry(
    modelId: string
): AsrBenchmarkMatrixEntry | undefined {
    return ASR_BENCHMARK_MATRIX.find((entry) => entry.id === modelId)
}

export function isAsrBenchmarkEntrySupportedOnPlatform(
    entry: AsrBenchmarkMatrixEntry,
    platform: 'android' | 'ios' | 'web' = Platform.OS as
        | 'android'
        | 'ios'
        | 'web'
): boolean {
    if (!entry.platforms || entry.platforms.length === 0) return true
    return entry.platforms.includes(platform)
}

export function getAsrBenchmarkTierLabel(tier: AsrBenchmarkTier): string {
    switch (tier) {
        case 'live-mobile':
            return 'Live mobile'
        case 'live-general':
            return 'Live general'
        case 'live-recent':
            return 'Live recent'
        case 'offline-baseline':
            return 'Offline baseline'
        case 'offline-reference':
            return 'Offline reference'
        case 'offline-translation-reference':
            return 'Translation reference'
    }
}
