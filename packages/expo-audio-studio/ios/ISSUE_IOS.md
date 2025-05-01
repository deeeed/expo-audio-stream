# iOS Recording Issue: No WAV Data/Analysis When Resampling (e.g., 16kHz) - RESOLVED

## Problem Summary

Initially, the iOS implementation failed to record WAV audio data or perform real-time analysis when the requested `sampleRate` (e.g., 16,000 Hz) differed from the hardware's native sample rate (e.g., 48,000 Hz), requiring resampling. Recording at the native hardware sample rate worked correctly.

The primary symptom was that the tap installed on the `audioEngine.inputNode` using `installTap(onBus:bufferSize:format:)` was **not receiving any audio buffers** when resampling was required (i.e., requested rate != hardware rate). This resulted in:

*   An empty WAV file (only the initial 44-byte header).
*   No data being sent to the `AudioProcessor` for real-time analysis.
*   No `AudioData` or `AudioAnalysis` events being emitted for the WAV stream.

Parallel compressed recording (e.g., AAC) functioned correctly even when the WAV stream failed, indicating the audio engine *was* capturing audio but not delivering it to the tap.

## Debugging History & Findings

1.  **Initial State:** Empty WAV file at 16kHz, working AAC at 16kHz. Confirmed 48kHz WAV worked.
2.  **Tap Installation Format:** Early attempts tried setting the tap format to the *requested* sample rate (16kHz), leading to `AVAudioIONodeImpl.mm:1334 Format mismatch` crashes because the tap format didn't match the actual hardware input format (often 48kHz).
3.  **Using `inputNode.outputFormat`:** Switched to installing the tap using the format reported by `inputNode.outputFormat(forBus: 0)`, assuming this reflected the actual hardware format. Resampling was handled later in `processAudioBuffer`. This fixed the crash but **did not** fix the original issue – the tap still received no buffers at 16kHz.
4.  **Race Condition:** Identified and fixed a race condition where `audioEngine.start()` was called before `isRecording` was set to `true`, causing the tap's initial guard check to fail. This allowed buffers to be processed *after* the flag was set, but the WAV file writing was still faulty (only the first buffer was written).
5.  **Background File I/O Refactor:** Improved WAV file writing by keeping the `FileHandle` open during recording instead of opening/closing for each buffer in the background queue. This fixed the partial file writing issue but didn't solve the core "no buffers received at 16kHz" problem.
6.  **Removing `setPreferredSampleRate`:** Tried removing the `session.setPreferredSampleRate` call, hoping the session would default to the hardware rate, allowing the 48kHz tap (based on `inputNode.outputFormat`) to receive buffers. This **worked** for the internal microphone but caused crashes with Bluetooth headsets, as the Bluetooth hardware *actually* operated at 16kHz, creating a new format mismatch.
7.  **Using `session.sampleRate`:** Attempted to use `session.sampleRate` *after* session activation to determine the tap format. This also proved unreliable, sometimes reporting 16kHz for the session while `inputNode.outputFormat` still reported 48kHz, leading back to the format mismatch crash.
8.  **Using `inputNode.inputFormat`:** After further analysis, discovered that `inputNode.inputFormat(forBus: 0)` gives the actual hardware input format, which may differ from the output format. This is the format that iOS strictly requires for a tap.

## Root Cause

The core issue stems from the unreliability and potential inconsistency between:

*   `AVAudioSession.sampleRate` (especially after `setPreferredSampleRate` or device changes).
*   `audioEngine.inputNode.outputFormat(forBus: 0)` (which might not immediately reflect the true hardware format).
*   `audioEngine.inputNode.inputFormat(forBus: 0)` (which provides the hardware's actual input format).
*   The actual sample rate the hardware is delivering to the audio engine.

Attempting to force a specific sample rate via `setPreferredSampleRate` or relying solely on `session.sampleRate` post-activation can lead to situations where the format used to install the tap does not match the format the audio engine expects/receives from the hardware input, causing either a crash (`Format mismatch`) or the tap simply not receiving any buffers.

## Final Solution

The most robust solution was found to be:

1.  **Configure Session:** Set up the `AVAudioSession` category, mode, and options as required. **Do not** call `setPreferredSampleRate`. Let the session negotiate the rate with the hardware.
2.  **Activate Session:** Activate the audio session.
3.  **Query Hardware Input Format (Just-In-Time):** Immediately **before** calling `installTap`, query the hardware's input format using `audioEngine.inputNode.inputFormat(forBus: 0)`. This provides the actual format that the hardware is delivering and that iOS requires for the tap.
4.  **Install Tap:** Install the tap using the exact `AVAudioFormat` obtained from `inputNode.inputFormat(forBus: 0)` in the previous step.
5.  **Resample in Tap:** Inside the tap's processing closure (`processAudioBuffer`), check if the received `buffer.format.sampleRate` differs from the `settings.sampleRate` requested by the user. If they differ, perform the resampling explicitly using `AVAudioConverter` (or a similar method) before writing the WAV data or performing analysis.

This approach ensures the tap format always matches what the hardware requires, regardless of the device (internal mic, Bluetooth) or the requested output sample rate. Subsequent resampling handles the conversion to the user's desired format.

## Additional Findings: Device Disconnection Handling

During testing, we discovered an issue with device disconnection (particularly Bluetooth headsets):

1. When a recording device disconnects, iOS reports a route change notification.
2. If we attempt to resume recording after the device disconnection or switch to a new device, the app would crash with `Format mismatch: input hw <AVAudioFormat: 1 ch, 16000 Hz, Float32>, client format <AVAudioFormat: 1 ch, 48000 Hz, Float32>`.

We implemented a robust solution with the following components:

1. **Hardware Format Detection:** Created a shared `installTapWithHardwareFormat` method that always queries the current hardware input format using `inputNode.inputFormat(forBus: 0)` before installing a tap.

2. **Format Verification on Resume:** When resuming recording after a pause (potentially due to device disconnect), we reinstall the tap with the current hardware format.

3. **Fallback Device Handling:** Implemented a configurable device disconnection behavior:
   - `pause`: Pause recording when the current device disconnects (default)
   - `fallback`: Automatically switch to the default device (built-in mic) and continue recording

4. **Size Tracking Preservation:** Ensured that during device transitions, the total audio data size is preserved to maintain continuity in the recording.

These improvements ensure that when audio devices change during a recording session, the app can either pause gracefully or continue recording with a fallback device, without data loss or crashes due to format mismatches.
