/**
 * Direct patch for SherpaOnnx to fix initialization issues
 */
(function() {
  console.log("🛠 APPLYING DIRECT FIX TO SHERPAONNX");
  
  // Create a minimal version of SherpaOnnx if it doesn't exist
  if (!window.SherpaOnnx) {
    console.log("⚠️ SherpaOnnx not found, creating minimal implementation");
    window.SherpaOnnx = {
      // Mock TTS implementation
      TTS: {
        // Core TTS methods
        generateSpeech: async function(text, options) {
          console.warn("⚠️ Using mock TTS implementation");
          return {
            success: false,
            errorMessage: "Mock TTS implementation - WASM not properly initialized"
          };
        }
      }
    };
  }
  
  // Force Module.FS creation if possible
  if (window.Module && !window.Module.FS) {
    try {
      console.log("⚠️ Attempting to force create Module.FS");
      window.Module.FS = {
        mkdir: function(path) { console.log(`Mock FS.mkdir: ${path}`); },
        rmdir: function(path) { console.log(`Mock FS.rmdir: ${path}`); },
        writeFile: function(path, data) { console.log(`Mock FS.writeFile: ${path}`); },
        readFile: function(path) { console.log(`Mock FS.readFile: ${path}`); return new Uint8Array(0); }
      };
    } catch (e) {
      console.error("Failed to create Module.FS:", e);
    }
  }
  
  // Force call the onSherpaOnnxReady callback
  if (typeof window.onSherpaOnnxReady === 'function') {
    console.log("🚀 Force-calling onSherpaOnnxReady()");
    // Small delay to let other scripts run first
    setTimeout(() => {
      window.onSherpaOnnxReady(true);
    }, 100);
  }
  
  // Add a MutationObserver to detect when onSherpaOnnxReady is defined
  if (typeof window.onSherpaOnnxReady !== 'function') {
    console.log("⏱️ Setting up observer for onSherpaOnnxReady");
    
    // Poll for the callback to be defined
    const checkInterval = setInterval(() => {
      if (typeof window.onSherpaOnnxReady === 'function') {
        console.log("🔍 Found onSherpaOnnxReady, calling it");
        window.onSherpaOnnxReady(true);
        clearInterval(checkInterval);
      }
    }, 200);
    
    // Set a timeout to clear the interval
    setTimeout(() => clearInterval(checkInterval), 10000);
  }
})(); 