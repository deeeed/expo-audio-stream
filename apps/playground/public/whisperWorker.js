// Code adapted from https://github.com/xenova/whisper-web/blob/main/src/worker.js
let pipeline, env
const TAG = '[WHISPER_WORKER]'
const SAMPLE_RATE = 16000

// Define model factories
// Ensures only one model is created of each type
class PipelineFactory {
    static task = null
    static model = null
    static quantized = null
    static instance = null
    static initialized = false

    constructor(tokenizer, model, quantized) {
        this.tokenizer = tokenizer
        this.model = model
        this.quantized = quantized
    }

    static async initialize({
        model,
        multilingual,
        quantized,
        progress_callback = null,
    }) {
        const isDistilWhisper = model.startsWith('distil-whisper/')

        let modelName = model
        if (!isDistilWhisper && !multilingual && !model.includes('large')) {
            modelName += '.en'
        }

        if (
            this.model !== modelName ||
            this.quantized !== quantized ||
            this.instance === null
        ) {
            const transformers = await import(
                'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2'
            )
            pipeline = transformers.pipeline
            env = transformers.env
            env.allowLocalModels = false
            console.log(`${TAG} env:`, env)

            this.task = 'automatic-speech-recognition'
            this.model = modelName
            this.quantized = quantized

            console.log(
                `${TAG} Initializing pipeline for ${this.model} quantized: ${this.quantized} multilingual: ${multilingual}`
            )

            if (this.instance !== null) {
                // this.instance.dispose()
                this.instance = null
            }

            const revision = model.includes('/whisper-medium')
                ? 'no_attentions'
                : 'main'
            this.instance = await pipeline(this.task, this.model, {
                quantized: this.quantized,
                progress_callback,
                revision,
            })

            this.initialized = true
        }

        console.log(`${TAG} Pipeline initialized`, this.instance)
        return this.instance
    }

    static async getInstance() {
        return this.instance
    }
}

class AutomaticSpeechRecognitionPipelineFactory extends PipelineFactory {
    static task = 'automatic-speech-recognition'
    static model = null
    static quantized = null
}

const transcribe = async ({
    audio,
    model,
    jobId, // string | undefined
    position = 0,
    quantized,
    subtask,
    language,
}) => {
    const isDistilWhisper = model.startsWith('distil-whisper/')

    console.log(
        `${TAG} jobId=${jobId} Transcribing with model: ${model} (quantized: ${quantized}) for ${language} (${subtask})`
    )
    const p = AutomaticSpeechRecognitionPipelineFactory
    const transcriber = await p.getInstance()

    console.log(`${TAG} jobId=${jobId} Transcriber:`, transcriber)

    const time_precision =
        transcriber.processor.feature_extractor.config.chunk_length /
        transcriber.model.config.max_source_positions

    const chunks_to_process = [
        {
            tokens: [],
            finalised: false,
        },
    ]

    function chunk_callback(chunk) {
        // console.log(`Chunk ${chunk.index + 1}/${chunk.total_chunks}`, chunk)
        const last = chunks_to_process[chunks_to_process.length - 1]

        Object.assign(last, chunk)
        last.finalised = true

        if (!chunk.is_last) {
            chunks_to_process.push({
                tokens: [],
                finalised: false,
            })
        }
    }

    function callback_function(item) {
        // console.log('Callback function', item)
        const last = chunks_to_process[chunks_to_process.length - 1]

        last.tokens = [...item[0].output_token_ids]

        const data = transcriber.tokenizer._decode_asr(chunks_to_process, {
            time_precision,
            id: jobId,
            return_timestamps: true,
            force_full_sequences: false,
        })
        const chunksAdjusted = data[1].chunks?.map((chunk) => {
            return {
                ...chunk,
                timestamp: [
                    chunk.timestamp[0] + position,
                    chunk.timestamp[1] ? chunk.timestamp[1] + position : null,
                ],
            }
        })
        data[1].chunks = chunksAdjusted

        // console.log(
        //     `${TAG} jobId=${jobId} Transcription callback update:`,
        //     data
        // )

        const updateData = {
            status: 'update',
            task: 'automatic-speech-recognition',
            jobId,
            startTime: position,
            endTime: position + audio.length / SAMPLE_RATE,
            data,
        }
        self.postMessage(updateData)
    }

    const options = {
        top_k: 0,
        do_sample: false,
        chunk_length_s: isDistilWhisper ? 20 : 30,
        stride_length_s: isDistilWhisper ? 3 : 5,
        language,
        // task: subtask, // can be used for translation to english
        return_timestamps: true,
        force_full_sequences: false,
        word_timestamps: true,
        callback_function,
        chunk_callback,
    }
    console.log(`${TAG} jobId=${jobId} Transcribing with options:`, options)

    const output = await transcriber(audio, options).catch((error) => {
        self.postMessage({
            status: 'error',
            task: 'automatic-speech-recognition',
            jobId,
            data: error,
        })
        return null
    })

    // adjust chunks timestamps based on position
    if (position && position > 0 && output) {
        output.startTime = position
        output.endTime = position + audio.length / SAMPLE_RATE
        const adjustedChunks = output.chunks.map((chunk) => {
            return {
                ...chunk,
                timestamp: [
                    chunk.timestamp[0] + position,
                    chunk.timestamp[1] ? chunk.timestamp[1] + position : null,
                ],
            }
        })
        output.chunks = adjustedChunks
    }
    console.log(`${TAG} adjusted transcription:`, output)

    return output
}

self.addEventListener('message', async (event) => {
    const message = event.data
    console.log(`${TAG} Received message`, message)

    if (message.type === 'initialize') {
        await PipelineFactory.initialize({
            model: message.model,
            quantized: message.quantized,
            multilingual: message.multilingual,
            language: message.languauge,
            subtask: message.subtask,
            progress_callback: (data) => {
                // console.debug(`${TAG} progress`, data)
                self.postMessage(data)
            },
        })
        self.postMessage({ status: 'ready' })
        return
    }

    if (message.type === 'transcribe') {
        if (!PipelineFactory.initialized) {
            console.warn(`${TAG} Pipeline not initialized, initializing now`)
            await PipelineFactory.initialize({
                model: message.model,
                quantized: message.quantized,
                multilingual: message.multilingual,
                language: message.languauge,
                subtask: message.subtask,
                progress_callback: (data) => {
                    // console.debug(`${TAG} progress`, data)
                    self.postMessage(data)
                },
            })
        }

        const startTime = performance.now()

        const segmentDuration = message.audio.length / SAMPLE_RATE
        const transcript = await transcribe({
            audio: message.audio,
            model: message.model,
            position: message.position,
            jobId: message.jobId,
            multilingual: message.multilingual,
            quantized: message.quantized,
            subtask: message.subtask,
            language: message.language,
        })
        if (transcript === null) return

        const elapsedTime = performance.now() - startTime
        console.log(
            `${TAG} jobId=${message.jobId} Transcribed ${segmentDuration}s completed in ${elapsedTime}ms:`,
            transcript
        )
        self.postMessage({
            status: 'complete',
            task: 'automatic-speech-recognition',
            jobId: message.jobId,
            data: transcript,
        })
    }
})
