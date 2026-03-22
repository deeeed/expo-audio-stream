/**
 * NOTE: Encodes audio in real-time via AudioContext + MediaRecorder playback.
 * A 60-second clip takes ~60 seconds to encode — this is a known Web Audio API
 * limitation; there is no offline API for Opus/AAC encoding in browsers.
 */
export function encodeCompressedAudio(
    buffer: AudioBuffer,
    format: 'opus' | 'aac',
    bitrate?: number
): Promise<{ data: ArrayBuffer; bitrate: number }> {
    return new Promise((resolve, reject) => {
        try {
            // On web, always use opus if aac is requested (browser aac support is rare)
            const actualFormat = format === 'aac' ? 'opus' : format

            // Check if MediaRecorder supports the requested format
            const mimeType =
                actualFormat === 'opus' ? 'audio/webm;codecs=opus' : 'audio/aac'
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                throw new Error(`MediaRecorder does not support ${mimeType}`)
            }

            // Create a new AudioContext and source
            const ctx = new (window.AudioContext ||
                (window as any).webkitAudioContext)()
            const source = ctx.createBufferSource()
            source.buffer = buffer

            // Create a MediaStreamDestination to capture the audio
            const destination = ctx.createMediaStreamDestination()
            source.connect(destination)

            // Create a MediaRecorder with the requested format
            const recorder = new MediaRecorder(destination.stream, {
                mimeType,
                audioBitsPerSecond:
                    bitrate || (actualFormat === 'opus' ? 32000 : 64000),
            })

            const chunks: Blob[] = []

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data)
                }
            }

            recorder.onstop = async () => {
                try {
                    const blob = new Blob(chunks, { type: mimeType })
                    const arrayBuffer = await blob.arrayBuffer()

                    // Get the actual bitrate used
                    const actualBitrate = Math.round(
                        (arrayBuffer.byteLength * 8) / buffer.duration
                    )

                    resolve({
                        data: arrayBuffer,
                        bitrate: actualBitrate / 1000, // Convert to kbps
                    })

                    // Clean up
                    ctx.close()
                } catch (error) {
                    reject(error)
                }
            }

            // Start recording and playback
            recorder.start()
            source.start(0)

            // Stop recording when the buffer finishes playing
            setTimeout(() => {
                recorder.stop()
                source.stop()
            }, buffer.duration * 1000)
        } catch (error) {
            reject(error)
        }
    })
}
