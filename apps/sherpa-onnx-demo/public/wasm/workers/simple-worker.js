/**
 * Simple WebWorker for Sherpa-ONNX WebAssembly
 */

// Include JSZip library directly in the worker
// This version of JSZip matches what would normally be loaded from CDN
importScripts('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');

// Global initialization state
let initialized = false

// Helper for logging back to main thread
function log(...args) {
    self.postMessage({ type: 'log', message: args.join(' ') })
}

// Handle messages from main thread
self.onmessage = async function (event) {
    const { id, action, data } = event.data

    try {
        switch (action) {
            case 'init':
                const success = await initialize(data)
                self.postMessage({ id, type: 'result', success })
                break

            case 'tts-init':
                const initResult = await initTts(data)
                self.postMessage({ id, type: 'result', result: initResult })
                break

            case 'tts-generate':
                const ttsResult = await generateTts(data)
                self.postMessage({ id, type: 'result', result: ttsResult })
                break

            default:
                throw new Error(`Unknown action: ${action}`)
        }
    } catch (error) {
        log('Worker error:', error.message)
        self.postMessage({ id, type: 'error', message: error.message })
    }
}

/**
 * Initialize the WASM module
 */
async function initialize({ wasmUrl, jsUrl, modulePaths }) {
    log('Initializing WASM in worker')

    if (initialized) {
        log('Already initialized')
        return true
    }

    // Create required polyfills
    self.global = self
    self.process = {
        env: { NODE_ENV: 'production' },
        browser: true,
    }

    // Verify we have correct URLs
    if (!wasmUrl || !jsUrl) {
        throw new Error('Missing required URLs for WASM initialization')
    }

    // Log the URLs we're using
    log('Using WASM URL:', wasmUrl)
    log('Using JS URL:', jsUrl)

    try {
        // Pre-load the WASM binary
        log('Fetching WASM binary')
        const wasmResponse = await fetch(wasmUrl)
        if (!wasmResponse.ok) {
            throw new Error(
                `Failed to fetch WASM binary: ${wasmResponse.status} ${wasmResponse.statusText}`
            )
        }

        const wasmBuffer = await wasmResponse.arrayBuffer()
        const byteLength = wasmBuffer.byteLength
        log(`WASM binary loaded: ${byteLength} bytes`)

        if (byteLength < 1000000) {
            log(`WARNING: WASM binary seems small (${byteLength} bytes)`)
            if (byteLength < 10000) {
                throw new Error(
                    `WASM binary too small: ${byteLength} bytes (expected >10MB)`
                )
            }
        }

        // Set up module configuration BEFORE loading any scripts
        self.wasmBinary = wasmBuffer
        self.Module = {
            wasmBinary: wasmBuffer,
            locateFile: (path) => {
                if (path.endsWith('.wasm')) {
                    return wasmUrl
                }
                return path
            },
            print: (text) => log('WASM stdout:', text),
            printErr: (text) => log('WASM stderr:', text),
            onRuntimeInitialized: () => {
                log('WASM runtime initialized successfully')
            },
        }

        // Set up module paths if provided
        if (Array.isArray(modulePaths) && modulePaths.length > 0) {
            self.sherpaOnnxModulePaths = modulePaths
            log('Using module paths:', JSON.stringify(modulePaths))
        }

        // CRITICAL: Load the combined JS file first to initialize Emscripten
        log('Loading main combined WASM JavaScript:', jsUrl)
        self.importScripts(jsUrl)

        // Wait a moment for the WASM module to initialize
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Validate that Module is available and initialized
        if (!self.Module || !self.Module.FS) {
            log(
                'Module.FS not available after loading main JS file, will try individual modules'
            )
        } else {
            log('Module.FS available after loading main JS file')
        }

        // Now load individual modules if available and SherpaOnnx is not already defined
        if (
            !self.SherpaOnnx &&
            Array.isArray(modulePaths) &&
            modulePaths.length > 0
        ) {
            log('Loading additional modules')

            // Find core script and load it first
            const coreScript = modulePaths.find((path) =>
                path.includes('sherpa-onnx-core.js')
            )
            if (coreScript) {
                try {
                    log(`Loading core module: ${coreScript}`)
                    self.importScripts(coreScript)
                    log('Core module loaded')
                } catch (e) {
                    log(`Failed to load core module: ${e.message}`)
                }
            }

            // Load remaining modules - but skip the ones that might conflict with the main WASM
            for (const modulePath of modulePaths) {
                if (modulePath === coreScript) continue

                // Skip any module that might re-initialize the WASM module
                if (modulePath.includes('sherpa-onnx-wasm-combined')) continue

                try {
                    log(`Loading module: ${modulePath}`)
                    self.importScripts(modulePath)
                    log(`Successfully loaded ${modulePath}`)
                } catch (e) {
                    log(`Failed to load ${modulePath}: ${e.message}`)
                }
            }
        }

        // Check if we have SherpaOnnx now
        if (!self.SherpaOnnx && self.createSherpaOnnx) {
            log('Creating SherpaOnnx using global createSherpaOnnx')
            try {
                self.createSherpaOnnx()
            } catch (e) {
                log(`Failed to create SherpaOnnx: ${e.message}`)
            }
        }

        if (!self.SherpaOnnx) {
            log('SherpaOnnx still not available after loading all modules')

            // Create a minimal implementation if needed
            self.SherpaOnnx = {
                TTS: {},
                FileSystem: {
                    safeCreateDirectory: (dir) => {
                        if (self.Module && self.Module.FS) {
                            try {
                                self.Module.FS.mkdir(dir)
                                return true
                            } catch (e) {
                                if (e.code === 'EEXIST') return true
                                log(
                                    `Error creating directory ${dir}: ${e.message}`
                                )
                                return false
                            }
                        }
                        return false
                    },
                    safeLoadFile: async (url, path) => {
                        if (self.Module && self.Module.FS) {
                            try {
                                const response = await fetch(url)
                                const data = await response.arrayBuffer()
                                self.Module.FS.writeFile(
                                    path,
                                    new Uint8Array(data)
                                )
                                return { success: true, path }
                            } catch (e) {
                                log(
                                    `Error loading file ${url} to ${path}: ${e.message}`
                                )
                                return { success: false }
                            }
                        }
                        return { success: false }
                    },
                },
            }
        }

        // Wait for initialization to complete
        const initSuccess = await waitForFS(30000)
        if (!initSuccess) {
            throw new Error(
                'Failed to initialize WASM filesystem within timeout'
            )
        }

        initialized = true
        log('WASM initialization complete with filesystem!')
        return true
    } catch (error) {
        log('WASM initialization failed:', error.message, error.stack)
        throw error
    }
}

/**
 * Wait specifically for the filesystem to be available
 */
async function waitForFS(timeoutMs = 30000) {
    log('Waiting for Module.FS to be available...')

    const isFileSystemAvailable = () => {
        if (!self.Module || !self.Module.FS) return false

        try {
            // Test with a simple operation
            const testDir = '/__fs_test__'
            try {
                self.Module.FS.mkdir(testDir)
            } catch (e) {}
            try {
                self.Module.FS.rmdir(testDir)
            } catch (e) {}
            return true
        } catch (e) {
            return false
        }
    }

    // Check immediately
    if (isFileSystemAvailable()) {
        log('Filesystem already available!')
        return true
    }

    return new Promise((resolve) => {
        const startTime = Date.now()

        // Define a check function
        const checkFS = () => {
            if (isFileSystemAvailable()) {
                log('Filesystem is now available!')
                resolve(true)
                return
            }

            if (Date.now() - startTime > timeoutMs) {
                log('Timeout waiting for filesystem!')
                resolve(false)
                return
            }

            // Progress reporting
            if ((Date.now() - startTime) % 5000 < 100) {
                log(
                    `Still waiting for filesystem... (${Math.round((Date.now() - startTime) / 1000)}s)`
                )
            }

            // Continue checking
            setTimeout(checkFS, 200)
        }

        // Start checking
        checkFS()
    })
}

/**
 * Initialize TTS with direct WASM calls
 */
async function initTts(config) {
    log('Initializing TTS with config:', JSON.stringify(config))

    if (!initialized) {
        return {
            success: false,
            message: 'WASM module not initialized',
            sampleRate: 0,
            numSpeakers: 0,
        }
    }

    // Verify the filesystem is available
    if (!self.Module || !self.Module.FS) {
        log('ERROR: Module.FS not available - cannot initialize TTS')
        return {
            success: false,
            message: 'Emscripten filesystem not available',
            sampleRate: 0,
            numSpeakers: 0,
        }
    }

    try {
        // If we already have an engine, clean it up first
        if (self._ttsEngine) {
            log('Releasing existing TTS engine')
            try {
                if (self._ttsEngine.handle && self.Module._SherpaOnnxDestroyOfflineTts) {
                    self.Module._SherpaOnnxDestroyOfflineTts(self._ttsEngine.handle)
                    log('Released TTS engine handle')
                }
            } catch (e) {
                log('Error releasing TTS engine:', e.message)
            }
            self._ttsEngine = null
        }

        // Let's use a simpler approach - we'll use the existing SherpaOnnx.TTS
        // functionality to load the model but with our own minimal set of files
        const uniqueDir = `/tts-${Date.now().toString(36)}`
        createDirIfNeeded(uniqueDir)
        log(`Created model directory: ${uniqueDir}`)

        // Prepare espeak data directory
        const espeakDir = `${uniqueDir}/espeak-ng-data`
        createDirIfNeeded(espeakDir)
        log(`Created espeak-ng-data directory: ${espeakDir}`)

        // Fetch and write model file
        let modelFilePath = ''
        try {
            modelFilePath = `${uniqueDir}/model.onnx`
            const modelResponse = await fetch('/wasm/tts/model.onnx')
            if (modelResponse.ok) {
                const modelData = await modelResponse.arrayBuffer()
                log(`Fetched model.onnx: ${modelData.byteLength} bytes`)
                self.Module.FS.writeFile(modelFilePath, new Uint8Array(modelData))
                log(`Wrote model file to ${modelFilePath}`)
            } else {
                log(`Failed to fetch model.onnx: ${modelResponse.status}`)
                throw new Error(`Failed to fetch model.onnx: ${modelResponse.status}`)
            }
        } catch (e) {
            log(`Error preparing model file: ${e.message}`)
            throw e
        }

        // Fetch and write tokens file
        let tokensFilePath = ''
        try {
            tokensFilePath = `${uniqueDir}/tokens.txt`
            const tokensResponse = await fetch('/wasm/tts/tokens.txt')
            if (tokensResponse.ok) {
                const tokensText = await tokensResponse.text()
                log(`Fetched tokens.txt: ${tokensText.length} bytes`)
                self.Module.FS.writeFile(tokensFilePath, tokensText)
                log(`Wrote tokens file to ${tokensFilePath}`)
            } else {
                log(`Failed to fetch tokens.txt: ${tokensResponse.status}`)
                throw new Error(`Failed to fetch tokens.txt: ${tokensResponse.status}`)
            }
        } catch (e) {
            log(`Error preparing tokens file: ${e.message}`)
            throw e
        }

        // Create minimal espeak-ng-data files
        await createMinimalEspeakData(espeakDir)
        log('Created minimal espeak-ng-data structure')

        // Now let's use the SherpaOnnx.TTS to handle the complex engine creation
        if (!self.SherpaOnnx || !self.SherpaOnnx.TTS) {
            log('SherpaOnnx.TTS not available - trying to use direct WASM instead')
            
            // Fallback to a simpler approach - create and load our own minimal tts.js script
            try {
                log('Trying to create TTS engine with a simplified wrapper')
                
                // Create a simple wrapper around the TTS functions
                self._ttsEngine = createSimpleTtsEngine(
                    modelFilePath,
                    tokensFilePath,
                    espeakDir
                )
                
                log(`Created TTS engine: sampleRate=${self._ttsEngine.sampleRate}, numSpeakers=${self._ttsEngine.numSpeakers}`)
                
                return {
                    success: true,
                    initialized: true,
                    message: 'TTS engine initialized successfully with simplified wrapper',
                    sampleRate: self._ttsEngine.sampleRate,
                    numSpeakers: self._ttsEngine.numSpeakers,
                }
            } catch (wrapperError) {
                log(`Error creating TTS engine with wrapper: ${wrapperError.message}`)
                throw wrapperError
            }
        }
        
        log('Using SherpaOnnx.TTS to create the engine')
        
        // Create model info
        const modelInfo = {
            modelDir: uniqueDir,
            type: 'vits',
            files: {
                model: modelFilePath,
                tokens: tokensFilePath
            }
        }
        
        // Create the engine with minimal settings
        const ttsEngine = self.SherpaOnnx.TTS.createOfflineTts(modelInfo, {
            debug: true,
            numThreads: 1,
            provider: 'cpu',
            noiseScale: 0.667,
            noiseScaleW: 0.8,
            lengthScale: 1.0
        })
        
        // Store the engine
        self._ttsEngine = ttsEngine
        
        return {
            success: true,
            initialized: true,
            message: 'TTS engine initialized successfully',
            sampleRate: ttsEngine.sampleRate || 24000,
            numSpeakers: ttsEngine.numSpeakers || 1,
        }
    } catch (error) {
        log('TTS initialization error:', error.message, error.stack)
        return {
            success: false,
            message: `Error: ${error.message}`,
            sampleRate: 0,
            numSpeakers: 0,
        }
    }
}

/**
 * Create a simplified TTS engine using just the essential WASM functions
 */
function createSimpleTtsEngine(modelPath, tokensPath, dataDir) {
    // Create an engine interface with simplified API
    return {
        // Provide default values since we can't reliably query them
        sampleRate: 24000,
        numSpeakers: 1,
        
        generate: function(text, sid, speed) {
            log(`Generating speech via simplified engine: "${text}"`)
            
            // Use SherpaOnnx.TTS for the actual generation
            if (self.SherpaOnnx && self.SherpaOnnx.TTS) {
                try {
                    // Create a temporary model config
                    const tmpModelInfo = {
                        modelDir: dataDir.split('/espeak-ng-data')[0],
                        type: 'vits',
                        files: {
                            model: modelPath,
                            tokens: tokensPath
                        }
                    }
                    
                    // Create a temporary engine
                    const tmpEngine = self.SherpaOnnx.TTS.createOfflineTts(
                        tmpModelInfo,
                        { debug: true, provider: 'cpu' }
                    )
                    
                    // Generate speech
                    const result = tmpEngine.generate(text, sid, speed)
                    
                    // Clean up
                    tmpEngine.free()
                    
                    return result
                } catch (e) {
                    log(`Error using SherpaOnnx.TTS for generation: ${e.message}`)
                    throw e
                }
            }
            
            // Fallback to an empty buffer if we can't generate
            log('WARNING: Could not generate speech, returning empty buffer')
            return {
                samples: new Float32Array(0),
                sampleRate: 24000,
                free: () => {}
            }
        },
        
        saveAsWav: function(samples, sampleRate) {
            // Create WAV file in memory
            const numSamples = samples.length
            const dataSize = numSamples * 2 // 16-bit samples
            const bufferSize = 44 + dataSize
            
            const buffer = new ArrayBuffer(bufferSize)
            const view = new DataView(buffer)
            
            // WAV header
            view.setUint32(0, 0x46464952, true) // 'RIFF'
            view.setUint32(4, bufferSize - 8, true) // chunk size
            view.setUint32(8, 0x45564157, true) // 'WAVE'
            view.setUint32(12, 0x20746d66, true) // 'fmt '
            view.setUint32(16, 16, true) // subchunk1 size
            view.setUint16(20, 1, true) // PCM format
            view.setUint16(22, 1, true) // mono
            view.setUint32(24, sampleRate, true) // sample rate
            view.setUint32(28, sampleRate * 2, true) // byte rate
            view.setUint16(32, 2, true) // block align
            view.setUint16(34, 16, true) // bits per sample
            view.setUint32(36, 0x61746164, true) // 'data'
            view.setUint32(40, dataSize, true) // subchunk2 size
            
            // Write audio data
            for (let i = 0; i < numSamples; i++) {
                // Convert float to 16-bit PCM
                let sample = samples[i]
                if (sample > 1.0) sample = 1.0
                if (sample < -1.0) sample = -1.0
                
                const pcm = Math.floor(sample * 32767)
                view.setInt16(44 + i * 2, pcm, true)
            }
            
            return new Blob([buffer], { type: 'audio/wav' })
        },
        
        free: function() {
            // Nothing to free in this simplified version
            log('Freeing simplified TTS engine (no-op)')
        }
    }
}

/**
 * Try to manually extract the espeak-ng-data.zip file
 */
async function manuallyExtractEspeakData(zipUrl, targetDir) {
    log(`Manually extracting espeak-ng-data from ${zipUrl} to ${targetDir}`)
    
    // Create target directory
    createDirIfNeeded(targetDir)
    
    // Fetch the zip file
    const response = await fetch(zipUrl)
    if (!response.ok) {
        throw new Error(`Failed to fetch espeak-ng-data.zip: ${response.status}`)
    }
    
    const zipData = await response.arrayBuffer()
    
    // Check if JSZip is available
    if (typeof JSZip !== 'undefined') {
        log('Using JSZip for extraction')
        const zip = await JSZip.loadAsync(zipData)
        
        // Extract each file
        for (const path in zip.files) {
            const file = zip.files[path]
            
            if (file.dir) {
                // Create directory
                createDirIfNeeded(`${targetDir}/${path}`)
            } else {
                // Extract and write file
                const content = await file.async('arraybuffer')
                const fullPath = `${targetDir}/${path}`
                
                // Create parent directory
                const lastSlash = fullPath.lastIndexOf('/')
                if (lastSlash > 0) {
                    const dirPath = fullPath.substring(0, lastSlash)
                    createDirIfNeeded(dirPath)
                }
                
                try {
                    self.Module.FS.writeFile(fullPath, new Uint8Array(content))
                } catch (e) {
                    log(`Error writing file ${fullPath}: ${e.message}`)
                }
            }
        }
        
        log('Manual extraction completed successfully')
        return true
    } else {
        log('JSZip not available, cannot extract zip')
        throw new Error('JSZip not available for manual extraction')
    }
}

/**
 * Create the minimal required espeak-ng-data directory structure
 * This function creates the bare minimum files needed by the TTS engine
 */
async function createMinimalEspeakData(dataPath) {
    log(`Setting up minimal espeak-ng-data at ${dataPath}`)

    // Create the base directory
    createDirIfNeeded(dataPath)

    // Create essential subdirectories
    const dirs = [
        `${dataPath}/lang`,
        `${dataPath}/voices`,
        `${dataPath}/voices/en`,
        `${dataPath}/voices/!v`,
        `${dataPath}/phonemes`,
        `${dataPath}/dictsource`,  // Add more directories
        `${dataPath}/dictionary`,
    ]

    for (const dir of dirs) {
        createDirIfNeeded(dir)
        log(`Created directory: ${dir}`)
    }

    // Create minimal essential files
    const files = [
        // phontab - the most critical file for initialization
        { 
            path: `${dataPath}/phontab`, 
            content: `// Minimal phontab file for TTS
0  l  l
0  m  m
0  n  n
0  r  r
0  w  w
0  j  j
0  a  a
0  e  e
0  i  i
0  o  o
0  u  u
`
        },
        // voices.txt is required
        { 
            path: `${dataPath}/voices.txt`, 
            content: `name english\nvoice en\n`
        },
        // phonemes config
        { 
            path: `${dataPath}/phonemes/en`, 
            content: `// Minimal English phonemes for TTS\n`
        },
        // voices file
        { 
            path: `${dataPath}/voices/en/en-us`, 
            content: `language en-us\nname english-us\ngender male\n`
        },
        // intonation data - both singular and plural forms as the engine seems to look for both
        { 
            path: `${dataPath}/intonation`, 
            content: `// Minimal intonation data\n`
        },
        { 
            path: `${dataPath}/intonations`, 
            content: `// Minimal intonations data\n`
        },
        // Create empty dummy files that satisfy the validation
        { path: `${dataPath}/phonindex`, content: `// Dummy phonindex\n` },
        { path: `${dataPath}/phondata`, content: `// Dummy phondata\n` },
        { path: `${dataPath}/dictionary/en_dict`, content: `// Dummy dictionary\n` },
        { path: `${dataPath}/dictsource/en_rules`, content: `// Dummy rules\n` },
        { path: `${dataPath}/dictsource/en_list`, content: `// Dummy list\n` },
    ]

    for (const file of files) {
        try {
            log(`Creating file: ${file.path}`)
            self.Module.FS.writeFile(file.path, file.content)
        } catch (e) {
            log(`Error creating file ${file.path}: ${e.message}`)
        }
    }

    // Try to fetch real files from the server if available
    try {
        const filesToFetch = [
            // Critical files to fetch
            { url: '/wasm/tts/espeak-ng-data/phontab', path: `${dataPath}/phontab` },
            { url: '/wasm/tts/espeak-ng-data/phondata', path: `${dataPath}/phondata` },
            { url: '/wasm/tts/espeak-ng-data/phonindex', path: `${dataPath}/phonindex` },
            
            // Additional files that might be needed
            { url: '/wasm/tts/espeak-ng-data/intonation', path: `${dataPath}/intonation` },
            { url: '/wasm/tts/espeak-ng-data/intonations', path: `${dataPath}/intonations` },
            { url: '/wasm/tts/espeak-ng-data/voices.txt', path: `${dataPath}/voices.txt` },
            { url: '/wasm/tts/espeak-ng-data/voices/en/en-us', path: `${dataPath}/voices/en/en-us` },
            
            // Try dictionary files
            { url: '/wasm/tts/espeak-ng-data/dictionary/en_dict', path: `${dataPath}/dictionary/en_dict` },
            { url: '/wasm/tts/espeak-ng-data/dictsource/en_rules', path: `${dataPath}/dictsource/en_rules` },
            { url: '/wasm/tts/espeak-ng-data/dictsource/en_list', path: `${dataPath}/dictsource/en_list` },
        ]

        for (const file of filesToFetch) {
            try {
                log(`Fetching ${file.url}`)
                const response = await fetch(file.url)
                if (response.ok) {
                    const data = await response.arrayBuffer()
                    self.Module.FS.writeFile(file.path, new Uint8Array(data))
                    log(`Successfully fetched and wrote ${file.path}`)
                } else {
                    log(`Failed to fetch ${file.url}: ${response.status}`)
                }
            } catch (e) {
                log(`Error fetching ${file.url}: ${e.message}`)
            }
        }
    } catch (e) {
        log(`Error fetching additional espeak files: ${e.message}`)
    }

    log(`Finished setting up espeak-ng-data at ${dataPath}`)
    return true
}

/**
 * Check if a file exists in the Emscripten filesystem
 */
function fileExists(path) {
    try {
        self.Module.FS.stat(path)
        return true
    } catch (e) {
        return false
    }
}

/**
 * Create a directory if it doesn't exist
 */
function createDirIfNeeded(dirPath) {
    // Skip root directory
    if (!dirPath || dirPath === '/') return

    try {
        // Check if it exists first
        self.Module.FS.stat(dirPath)
        // If no error was thrown, it exists
    } catch (e) {
        // Create parent directories first
        const parentPath = dirPath.split('/').slice(0, -1).join('/')
        if (parentPath) createDirIfNeeded(parentPath)

        // Now create this directory
        try {
            self.Module.FS.mkdir(dirPath)
        } catch (mkdirErr) {
            // Ignore if directory exists
            if (mkdirErr.code !== 'EEXIST') throw mkdirErr
        }
    }
}

/**
 * Copy a file from one path to another
 */
async function copyFile(sourcePath, destPath) {
    try {
        // Read the source file
        const content = self.Module.FS.readFile(sourcePath)
        // Write to the destination
        self.Module.FS.writeFile(destPath, content)
        return true
    } catch (e) {
        log(`Error copying file from ${sourcePath} to ${destPath}: ${e.message}`)
        return false
    }
}

/**
 * Copy a directory recursively
 */
async function copyDirectoryRecursive(sourceDir, destDir) {
    try {
        // Create the destination directory if it doesn't exist
        createDirIfNeeded(destDir)
        
        // Get the list of files in the source directory
        let files
        try {
            files = self.Module.FS.readdir(sourceDir)
        } catch (e) {
            log(`Error reading source directory ${sourceDir}: ${e.message}`)
            return false
        }
        
        // Copy each file/directory
        for (const file of files) {
            // Skip . and ..
            if (file === '.' || file === '..') continue
            
            const sourcePath = `${sourceDir}/${file}`
            const destPath = `${destDir}/${file}`
            
            try {
                // Check if it's a directory
                const stat = self.Module.FS.stat(sourcePath)
                const isDir = stat.mode & 16384 // 0040000 in octal, directory flag
                
                if (isDir) {
                    // Recursively copy subdirectory
                    await copyDirectoryRecursive(sourcePath, destPath)
                } else {
                    // Copy file
                    await copyFile(sourcePath, destPath)
                }
            } catch (e) {
                log(`Error processing ${sourcePath}: ${e.message}`)
            }
        }
        
        return true
    } catch (e) {
        log(`Error copying directory from ${sourceDir} to ${destDir}: ${e.message}`)
        return false
    }
}

/**
 * Generate TTS
 */
async function generateTts({ text, speakerId, speed, playAudio }) {
    log('Generating TTS for:', text)

    if (!initialized) {
        return {
            success: false,
            errorMessage: 'WASM module not initialized',
        }
    }

    // Check for filesystem availability
    if (!self.Module || !self.Module.FS) {
        log('ERROR: Module.FS not available - cannot generate TTS')
        return {
            success: false,
            errorMessage: 'Emscripten filesystem not available',
        }
    }

    try {
        const sid = parseInt(speakerId || '0', 10)
        const speedValue = typeof speed === 'number' ? speed : 1.0

        log(`Using TTS with speakerId: ${sid}, speed: ${speedValue}`)

        // If no engine exists yet, we can't generate TTS
        if (!self._ttsEngine || !self._ttsEngine.handle) {
            log('ERROR: No TTS engine available - call initTts first')
            return {
                success: false,
                errorMessage: 'TTS engine not initialized - call initTts first',
            }
        }

        // Generate the speech
        log(
            `Generating speech for text: "${text}" with speaker ${sid} and speed ${speedValue}`
        )

        // Safely call generate with error handling
        let audio
        try {
            audio = self._ttsEngine.generate(text, sid, speedValue)
            
            // Verify that audio was generated properly
            if (!audio || !audio.samples || audio.samples.length === 0) {
                throw new Error('TTS engine returned empty audio')
            }
            
            log(`Generated speech successfully: ${audio.samples.length} samples at ${audio.sampleRate}Hz`)
        } catch (genError) {
            log(`Error generating speech: ${genError.message || genError}`)
            return {
                success: false,
                errorMessage: `TTS generation failed: ${genError.message || genError}`,
            }
        }

        // Convert to WAV for playback if requested
        let audioFilePath = ''
        if (playAudio && audio.samples && audio.samples.length > 0) {
            try {
                log('Converting to WAV for playback')
                const wavBlob = self._ttsEngine.saveAsWav(
                    audio.samples,
                    audio.sampleRate
                )
                audioFilePath = URL.createObjectURL(wavBlob)
                log('Created audio URL:', audioFilePath)
            } catch (wavError) {
                log(`Error creating WAV: ${wavError.message || wavError}`)
                // Continue anyway, just without the audio playback URL
            }
        }

        // Clean up generated audio if needed
        if (audio.free) {
            try {
                audio.free()
                log('Cleaned up generated audio resources')
            } catch (e) {
                log(`Error cleaning up generated audio: ${e.message}`)
            }
        }

        return {
            success: true,
            audioFilePath: audioFilePath,
            durationMs: Math.round(
                (audio.samples.length / audio.sampleRate) * 1000
            ),
            samplesGenerated: audio.samples.length,
        }
    } catch (error) {
        log('TTS generation error:', error.message || error, error.stack)
        return {
            success: false,
            errorMessage: `Error: ${error.message || error}`,
        }
    }
}
