export async function resampleAudioBuffer(
    buffer: AudioBuffer,
    targetSampleRate: number,
    targetChannels: number
): Promise<AudioBuffer> {
    // If no change needed, return the original buffer
    if (
        buffer.sampleRate === targetSampleRate &&
        buffer.numberOfChannels === targetChannels
    ) {
        return buffer
    }

    // Calculate the new length based on the sample rate change
    const newLength = Math.round(
        (buffer.length * targetSampleRate) / buffer.sampleRate
    )

    // Create an offline context for resampling
    const offlineContext = new OfflineAudioContext(
        targetChannels,
        newLength,
        targetSampleRate
    )

    // Create a source node
    const source = offlineContext.createBufferSource()
    source.buffer = buffer

    // The OfflineAudioContext was created with targetChannels; the Web Audio API
    // applies its built-in speaker downmix/upmix rules automatically.
    source.connect(offlineContext.destination)

    // Start rendering
    source.start(0)
    const resampledBuffer = await offlineContext.startRendering()

    return resampledBuffer
}
