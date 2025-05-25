#!/usr/bin/env python3
"""
Generate test WAV files for Android unit tests
"""

import wave
import struct
import math
import array

def generate_sine_wave(frequency, duration, sample_rate, amplitude=0.5):
    """Generate sine wave samples"""
    num_samples = int(duration * sample_rate)
    samples = []
    for i in range(num_samples):
        t = i / sample_rate
        value = amplitude * math.sin(2 * math.pi * frequency * t)
        # Convert to 16-bit PCM
        pcm_value = int(value * 32767)
        samples.append(pcm_value)
    return samples

def create_wav_file(filename, channels, sample_rate, bit_depth, duration, frequency=440):
    """Create a WAV file with specified parameters"""
    print(f"Creating {filename}...")
    
    # Generate samples for left channel (or mono)
    samples = generate_sine_wave(frequency, duration, sample_rate)
    
    # For stereo, generate right channel with different frequency
    if channels == 2:
        right_samples = generate_sine_wave(frequency * 1.5, duration, sample_rate)
    
    # Prepare the data
    if bit_depth == 16:
        # Create array of signed shorts
        audio_data = array.array('h')  # signed short
        
        for i in range(len(samples)):
            if channels == 1:
                audio_data.append(samples[i])
            else:
                # Interleave stereo samples
                audio_data.append(samples[i])
                audio_data.append(right_samples[i])
    elif bit_depth == 8:
        # Create array of unsigned bytes
        audio_data = array.array('B')  # unsigned char
        
        for i in range(len(samples)):
            # Convert to 8-bit unsigned
            sample_8bit = ((samples[i] + 32768) >> 8) & 0xFF
            if channels == 1:
                audio_data.append(sample_8bit)
            else:
                right_8bit = ((right_samples[i] + 32768) >> 8) & 0xFF
                audio_data.append(sample_8bit)
                audio_data.append(right_8bit)
    else:
        raise ValueError(f"Unsupported bit depth: {bit_depth}")
    
    # Write WAV file
    with wave.open(filename, 'wb') as wav_file:
        wav_file.setnchannels(channels)
        wav_file.setsampwidth(bit_depth // 8)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio_data.tobytes())
    
    print(f"  Created: {filename} ({duration}s, {sample_rate}Hz, {channels}ch, {bit_depth}bit)")

# Generate test files
if __name__ == "__main__":
    try:
        # Basic mono file
        create_wav_file("test_mono_16bit_44100.wav", 
                       channels=1, sample_rate=44100, bit_depth=16, duration=1.0)
        
        # Stereo file
        create_wav_file("test_stereo_16bit_48000.wav", 
                       channels=2, sample_rate=48000, bit_depth=16, duration=1.0)
        
        # Short duration file
        create_wav_file("test_short_100ms.wav", 
                       channels=1, sample_rate=44100, bit_depth=16, duration=0.1)
        
        # Silent file (0 Hz frequency)
        create_wav_file("test_silence.wav", 
                       channels=1, sample_rate=44100, bit_depth=16, duration=0.5, frequency=0)
        
        print("\nAll test WAV files generated successfully!")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc() 