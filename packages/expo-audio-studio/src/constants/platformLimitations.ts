/**
 * Platform-specific audio recording limitations and capabilities
 */

import { Platform } from 'react-native'

import { EncodingType, BitDepth } from '../ExpoAudioStream.types'

export interface PlatformCapabilities {
    supportedEncodings: EncodingType[]
    supportedBitDepths: BitDepth[]
    notes: string[]
}

export const PLATFORM_CAPABILITIES: Record<string, PlatformCapabilities> = {
    ios: {
        supportedEncodings: ['pcm_16bit', 'pcm_32bit'],
        supportedBitDepths: [16, 32],
        notes: [
            '8-bit PCM is not natively supported by iOS AVAudioFormat',
            'Recording with 8-bit will fallback to 16-bit',
        ],
    },
    android: {
        supportedEncodings: ['pcm_8bit', 'pcm_16bit', 'pcm_32bit'],
        supportedBitDepths: [8, 16, 32],
        notes: ['All PCM formats are fully supported'],
    },
    web: {
        supportedEncodings: ['pcm_16bit', 'pcm_32bit'],
        supportedBitDepths: [16, 32],
        notes: [
            'Web Audio API typically works with 32-bit float',
            '8-bit is not commonly supported in browsers',
        ],
    },
}

/**
 * Get the current platform's audio capabilities
 */
export function getPlatformCapabilities(): PlatformCapabilities {
    return PLATFORM_CAPABILITIES[Platform.OS] || PLATFORM_CAPABILITIES.web
}

/**
 * Check if a specific encoding is supported on the current platform
 */
export function isEncodingSupported(encoding: EncodingType): boolean {
    const capabilities = getPlatformCapabilities()
    return capabilities.supportedEncodings.includes(encoding)
}

/**
 * Check if a specific bit depth is supported on the current platform
 */
export function isBitDepthSupported(bitDepth: BitDepth): boolean {
    const capabilities = getPlatformCapabilities()
    return capabilities.supportedBitDepths.includes(bitDepth)
}

/**
 * Get a fallback encoding if the requested one is not supported
 */
export function getFallbackEncoding(
    requestedEncoding: EncodingType
): EncodingType {
    if (isEncodingSupported(requestedEncoding)) {
        return requestedEncoding
    }

    // Default fallback is 16-bit PCM (supported on all platforms)
    return 'pcm_16bit'
}

/**
 * Get a fallback bit depth if the requested one is not supported
 */
export function getFallbackBitDepth(requestedBitDepth: BitDepth): BitDepth {
    if (isBitDepthSupported(requestedBitDepth)) {
        return requestedBitDepth
    }

    // Default fallback is 16-bit (supported on all platforms)
    return 16
}

/**
 * Validate and adjust recording configuration based on platform limitations
 */
export function validateRecordingConfig(config: { encoding?: EncodingType }): {
    encoding: EncodingType
    warnings: string[]
} {
    const warnings: string[] = []
    const capabilities = getPlatformCapabilities()

    let encoding = config.encoding || 'pcm_16bit'

    // Check if encoding is supported
    if (!isEncodingSupported(encoding)) {
        const fallback = getFallbackEncoding(encoding)
        warnings.push(
            `${encoding} is not supported on ${Platform.OS}. Using ${fallback} instead.`
        )
        encoding = fallback
    }

    // Add platform-specific notes if there were changes
    if (warnings.length > 0) {
        warnings.push(...capabilities.notes)
    }

    return {
        encoding,
        warnings,
    }
}
