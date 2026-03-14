/**
 * Force SherpaOnnx ready state after a small delay
 */
(function() {
  console.log('⚙️ Registering SherpaOnnx force-ready script');
  
  // Wait for SherpaOnnx module to become available
  const checkInterval = setInterval(() => {
    if (window.SherpaOnnx && window.SherpaOnnx.TTS) {
      console.log('🔥 SherpaOnnx force-ready: TTS module found, triggering ready callback');
      
      // Clear the interval
      clearInterval(checkInterval);
      
      // Force call the callback if it exists
      if (typeof window.onSherpaOnnxReady === 'function') {
        console.log('🚀 Force-calling onSherpaOnnxReady(true)');
        window.onSherpaOnnxReady(true);
      } else {
        console.warn('⚠️ onSherpaOnnxReady is not a function');
      }
    }
  }, 200); // Check every 200ms
  
  // Set a timeout to clear the interval after 30 seconds
  setTimeout(() => {
    clearInterval(checkInterval);
    console.warn('⏱️ Force-ready script timed out after 30 seconds');
  }, 30000);
})(); 