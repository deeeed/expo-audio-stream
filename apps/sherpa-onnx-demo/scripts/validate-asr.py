#!/usr/bin/env python3
"""
validate-asr.py — Python reference runner for sherpa-onnx ASR.

Usage:
  python3 scripts/validate-asr.py streaming assets/audio/jfk.wav
  python3 scripts/validate-asr.py streaming /tmp/zipformer_model/.../test_wavs/1.wav
  python3 scripts/validate-asr.py offline assets/audio/jfk.wav
  python3 scripts/validate-asr.py whisper assets/audio/jfk.wav

Model types:
  streaming  — sherpa-onnx-streaming-zipformer-en-20M-2023-02-17-mobile (transducer, online)
  offline    — alias for whisper
  whisper    — sherpa-onnx-whisper-small (offline)

Outputs: transcript text + timing. Used to compare Python ground truth vs app results.
"""

import sys
import os
import time
import wave
import struct

# ---------------------------------------------------------------------------
# Config — edit MODEL_BASE to point at your downloaded models dir
# ---------------------------------------------------------------------------
MODEL_BASE = os.environ.get(
    'SHERPA_MODEL_BASE',
    '/tmp/zipformer_model'
)

STREAMING_MODEL_DIR = os.path.join(
    MODEL_BASE,
    'sherpa-onnx-streaming-zipformer-en-20M-2023-02-17-mobile'
)

WHISPER_MODEL_DIR = os.environ.get(
    'SHERPA_WHISPER_DIR',
    os.path.expanduser('~/.cache/sherpa-onnx/whisper-small')
)


# ---------------------------------------------------------------------------
# Audio helpers
# ---------------------------------------------------------------------------

def read_wav_samples(path: str) -> tuple[list[float], int]:
    """Read a WAV file and return (samples_float32, sample_rate)."""
    with wave.open(path, 'rb') as f:
        n_channels = f.getnchannels()
        sampwidth = f.getsampwidth()
        sample_rate = f.getframerate()
        n_frames = f.getnframes()
        raw = f.readframes(n_frames)

    # Decode based on bit depth
    if sampwidth == 2:
        fmt = f'<{len(raw)//2}h'
        ints = struct.unpack(fmt, raw)
        samples = [s / 32768.0 for s in ints]
    elif sampwidth == 4:
        fmt = f'<{len(raw)//4}i'
        ints = struct.unpack(fmt, raw)
        samples = [s / 2147483648.0 for s in ints]
    else:
        raise ValueError(f'Unsupported sample width: {sampwidth}')

    # Mix down to mono if stereo
    if n_channels == 2:
        samples = [(samples[i] + samples[i+1]) / 2 for i in range(0, len(samples), 2)]

    return samples, sample_rate


# ---------------------------------------------------------------------------
# Streaming zipformer recognition
# ---------------------------------------------------------------------------

def run_streaming(wav_path: str) -> dict:
    import sherpa_onnx

    encoder = os.path.join(STREAMING_MODEL_DIR, 'encoder-epoch-99-avg-1.int8.onnx')
    decoder = os.path.join(STREAMING_MODEL_DIR, 'decoder-epoch-99-avg-1.onnx')
    joiner  = os.path.join(STREAMING_MODEL_DIR, 'joiner-epoch-99-avg-1.int8.onnx')
    tokens  = os.path.join(STREAMING_MODEL_DIR, 'tokens.txt')

    for f in [encoder, decoder, joiner, tokens]:
        if not os.path.exists(f):
            raise FileNotFoundError(f'Model file not found: {f}\n'
                                    f'Set SHERPA_MODEL_BASE env var or edit MODEL_BASE in script.')

    t0 = time.time()
    recognizer = sherpa_onnx.OnlineRecognizer.from_transducer(
        encoder=encoder,
        decoder=decoder,
        joiner=joiner,
        tokens=tokens,
        num_threads=4,
        decoding_method='greedy_search',
        max_active_paths=4,
    )
    init_ms = int((time.time() - t0) * 1000)

    samples, sample_rate = read_wav_samples(wav_path)
    print(f'  Audio: {len(samples)} samples @ {sample_rate} Hz '
          f'({len(samples)/sample_rate:.2f}s)')

    t1 = time.time()
    stream = recognizer.create_stream()
    stream.accept_waveform(sample_rate, samples)

    # Tail-pad with silence so the model can flush the last tokens
    tail_pad = [0.0] * int(0.66 * sample_rate)
    stream.accept_waveform(sample_rate, tail_pad)
    stream.input_finished()

    while recognizer.is_ready(stream):
        recognizer.decode_stream(stream)

    result = recognizer.get_result(stream)
    infer_ms = int((time.time() - t1) * 1000)

    # get_result() returns a string in sherpa-onnx Python API
    text = result if isinstance(result, str) else result.text
    return {
        'transcript': text.strip(),
        'init_ms': init_ms,
        'infer_ms': infer_ms,
        'model': 'streaming-zipformer-en-20M',
    }


# ---------------------------------------------------------------------------
# Whisper (offline) recognition
# ---------------------------------------------------------------------------

def run_whisper(wav_path: str) -> dict:
    import sherpa_onnx

    encoder = os.path.join(WHISPER_MODEL_DIR, 'small-encoder.int8.onnx')
    decoder = os.path.join(WHISPER_MODEL_DIR, 'small-decoder.int8.onnx')
    tokens  = os.path.join(WHISPER_MODEL_DIR, 'small-tokens.txt')

    for f in [encoder, decoder, tokens]:
        if not os.path.exists(f):
            raise FileNotFoundError(f'Model file not found: {f}\n'
                                    f'Set SHERPA_WHISPER_DIR env var or edit WHISPER_MODEL_DIR in script.')

    t0 = time.time()
    recognizer = sherpa_onnx.OfflineRecognizer.from_whisper(
        encoder=encoder,
        decoder=decoder,
        tokens=tokens,
        num_threads=2,
        decoding_method='greedy_search',
        language='en',
        task='transcribe',
    )
    init_ms = int((time.time() - t0) * 1000)

    samples, sample_rate = read_wav_samples(wav_path)
    print(f'  Audio: {len(samples)} samples @ {sample_rate} Hz '
          f'({len(samples)/sample_rate:.2f}s)')

    t1 = time.time()
    stream = recognizer.create_stream()
    stream.accept_waveform(sample_rate, samples)
    recognizer.decode_stream(stream)
    result = stream.result
    infer_ms = int((time.time() - t1) * 1000)

    return {
        'transcript': result.text.strip(),
        'init_ms': init_ms,
        'infer_ms': infer_ms,
        'model': 'whisper-small',
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    model_alias = sys.argv[1].lower()
    wav_path = sys.argv[2]

    # Resolve relative paths from CWD
    if not os.path.isabs(wav_path):
        wav_path = os.path.join(os.getcwd(), wav_path)

    if not os.path.exists(wav_path):
        print(f'ERROR: Audio file not found: {wav_path}')
        sys.exit(1)

    print(f'Model:  {model_alias}')
    print(f'Audio:  {wav_path}')
    print()

    try:
        if model_alias in ('streaming', 'zipformer'):
            info = run_streaming(wav_path)
        elif model_alias in ('offline', 'whisper'):
            info = run_whisper(wav_path)
        else:
            print(f'Unknown model alias: {model_alias!r}')
            print('Valid aliases: streaming, zipformer, offline, whisper')
            sys.exit(1)
    except ImportError:
        print('ERROR: sherpa_onnx not installed.')
        print('  conda run -n echobridge pip install sherpa-onnx')
        print('  or: pip install sherpa-onnx')
        sys.exit(1)
    except FileNotFoundError as e:
        print(f'ERROR: {e}')
        sys.exit(1)

    print(f'Model:      {info["model"]}')
    print(f'Init:       {info["init_ms"]} ms')
    print(f'Inference:  {info["infer_ms"]} ms')
    print()
    if info['transcript']:
        print(f'Transcript: {info["transcript"]}')
    else:
        print('Transcript: (empty — no speech detected)')


if __name__ == '__main__':
    main()
