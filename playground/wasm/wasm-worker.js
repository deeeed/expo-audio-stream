// Store loaded files in worker memory
let loadedWasmBinary = null;
let loadedWasmJs = null;

async function loadWasmFiles() {
    if (loadedWasmBinary && loadedWasmJs) {
        return;
    }

    const baseUrl = self.location.origin;
    const wasmUrl = new URL('/wasm/hello.wasm', baseUrl).href;
    const jsUrl = new URL('/wasm/hello.js', baseUrl).href;
    
    const [wasmResponse, jsResponse] = await Promise.all([
        fetch(wasmUrl),
        fetch(jsUrl)
    ]);

    loadedWasmBinary = await wasmResponse.arrayBuffer();
    loadedWasmJs = await jsResponse.text();
}

async function initWasm() {
    try {
        // Reset Module state
        self.Module = undefined;

        // Ensure files are loaded
        await loadWasmFiles();
        
        self.Module = {
            wasmBinary: loadedWasmBinary,
            noExitRuntime: true,
            print: (text) => {
                self.postMessage({ type: 'log', message: text });
                self.postMessage({ type: 'complete' });
            },
            printErr: (text) => {
                self.postMessage({ type: 'error', error: text });
            }
        };

        const initFunction = new Function('Module', loadedWasmJs);
        await initFunction(self.Module);

    } catch (error) {
        self.postMessage({ 
            type: 'error', 
            error: error.message 
        });
    }
}

self.onmessage = (e) => {
    if (e.data.type === 'init') {
        initWasm();
    } else if (e.data.type === 'terminate') {
        self.Module = undefined;
    }
};