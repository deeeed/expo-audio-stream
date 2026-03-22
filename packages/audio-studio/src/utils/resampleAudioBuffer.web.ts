export async function resampleAudioBuffer(
    context: AudioContext,
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

    console.log(
        `Resampling: ${buffer.sampleRate}Hz → ${targetSampleRate}Hz, ${buffer.numberOfChannels} → ${targetChannels} channels`
    )

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

    // If we need to change channel count
    if (buffer.numberOfChannels !== targetChannels) {
        if (targetChannels === 1 && buffer.numberOfChannels > 1) {
            // Downmix to mono
            const merger = offlineContext.createChannelMerger(1)

            // Create a gain node to reduce volume when downmixing to prevent clipping
            const gainNode = offlineContext.createGain()
            gainNode.gain.value = 1.0 / buffer.numberOfChannels

            source.connect(gainNode)
            gainNode.connect(merger)
            merger.connect(offlineContext.destination)
        } else if (targetChannels === 2 && buffer.numberOfChannels === 1) {
            // Upmix mono to stereo (duplicate the channel)
            const splitter = offlineContext.createChannelSplitter(1)
            const merger = offlineContext.createChannelMerger(2)

            source.connect(splitter)
            splitter.connect(merger, 0, 0)
            splitter.connect(merger, 0, 1)
            merger.connect(offlineContext.destination)
        } else {
            // For other cases, just connect and let the system handle it
            source.connect(offlineContext.destination)
        }
    } else {
        // No channel conversion needed
        source.connect(offlineContext.destination)
    }

    // Start rendering
    source.start(0)
    const resampledBuffer = await offlineContext.startRendering()

    console.log(
        `Resampling complete: ${resampledBuffer.length} samples at ${resampledBuffer.sampleRate}Hz`
    )

    return resampledBuffer
}
