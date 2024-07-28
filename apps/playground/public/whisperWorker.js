let pipeline, env
const TAG = '[WHISPER_WORKER]'

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

    static async initialize(modelName, quantized, progress_callback = null) {
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

            if (this.instance !== null) {
                // this.instance.dispose()
                this.instance = null
            }

            this.instance = pipeline(this.task, this.model, {
                quantized: this.quantized,
                progress_callback,
                revision: this.model.includes('/whisper-medium')
                    ? 'no_attentions'
                    : 'main',
            })

            this.initialized = true
        }
    }

    static async getInstance() {
        return this.instance
    }
}

self.addEventListener('message', async (event) => {
    const message = event.data

    if (message.type === 'initialize') {
        await PipelineFactory.initialize(
            message.model,
            message.quantized,
            (data) => {
                self.postMessage(data)
            }
        )
        self.postMessage({ status: 'ready' })
        return
    }

    if (message.type === 'transcribe') {
        if (!PipelineFactory.initialized) {
            await PipelineFactory.initialize(
                message.model,
                message.quantized,
                (data) => {
                    self.postMessage(data)
                }
            )
        }

        const transcript = await transcribe(
            message.audio,
            message.model,
            message.multilingual,
            message.quantized,
            message.subtask,
            message.language
        )
        if (transcript === null) return

        self.postMessage({
            status: 'complete',
            task: 'automatic-speech-recognition',
            data: transcript,
        })
    }
})

class AutomaticSpeechRecognitionPipelineFactory extends PipelineFactory {
    static task = 'automatic-speech-recognition'
    static model = null
    static quantized = null
}

const transcribe = async (
    audio,
    model,
    multilingual,
    quantized,
    subtask,
    language
) => {
    const isDistilWhisper = model.startsWith('distil-whisper/')

    let modelName = model
    if (!isDistilWhisper && !multilingual) {
        modelName += '.en'
    }

    console.log(
        `Transcribing with model: ${modelName} (quantized: ${quantized}) for ${language} (${subtask})`
    )
    const p = AutomaticSpeechRecognitionPipelineFactory

    if (p.model !== modelName || p.quantized !== quantized) {
        await p.initialize(modelName, quantized)
    }

    const transcriber = await p.getInstance()

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
        console.log(`Chunk ${chunk.index + 1}/${chunk.total_chunks}`, chunk)
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
        console.log('Callback function', item)
        const last = chunks_to_process[chunks_to_process.length - 1]

        last.tokens = [...item[0].output_token_ids]

        const data = transcriber.tokenizer._decode_asr(chunks_to_process, {
            time_precision,
            return_timestamps: true,
            force_full_sequences: false,
        })

        self.postMessage({
            status: 'update',
            task: 'automatic-speech-recognition',
            data,
        })
    }

    const options = {
        top_k: 0,
        do_sample: false,
        chunk_length_s: isDistilWhisper ? 20 : 30,
        stride_length_s: isDistilWhisper ? 3 : 5,
        language,
        task: subtask,
        return_timestamps: true,
        force_full_sequences: false,
        callback_function,
        chunk_callback,
    }
    console.log(`Transcribing with options:`, options)
    console.log(`audio:`, audio)

    const output = await transcriber(audio, options).catch((error) => {
        self.postMessage({
            status: 'error',
            task: 'automatic-speech-recognition',
            data: error,
        })
        return null
    })

    return output
}
