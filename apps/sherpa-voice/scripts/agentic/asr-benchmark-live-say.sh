#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/../.."

DEVICE_FILTER=""
PHRASE="${PHRASE:-Hello from the live microphone benchmark. Google Recorder style live transcription test.}"
PLAY_DURATION="${PLAY_DURATION:-45}"
PLAY_VOLUME="${PLAY_VOLUME:-1}"
START_OFFSET="${START_OFFSET:-0}"
SOURCE_AUDIO_FILE="${SOURCE_AUDIO_FILE:-}"
VOICE="${VOICE:-Samantha}"
RATE="${RATE:-175}"
PRE_SPEECH_DELAY="${PRE_SPEECH_DELAY:-1}"
POST_SPEECH_DELAY="${POST_SPEECH_DELAY:-2}"
START_TIMEOUT="${START_TIMEOUT:-20}"
RESULT_TIMEOUT="${RESULT_TIMEOUT:-20}"
PORT="${WATCHER_PORT:-7500}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --device)
      DEVICE_FILTER="${2:-}"
      shift 2
      ;;
    --text|--phrase)
      PHRASE="${2:-}"
      shift 2
      ;;
    --audio-file)
      SOURCE_AUDIO_FILE="${2:-}"
      shift 2
      ;;
    --duration)
      PLAY_DURATION="${2:-}"
      shift 2
      ;;
    --offset)
      START_OFFSET="${2:-}"
      shift 2
      ;;
    --volume)
      PLAY_VOLUME="${2:-}"
      shift 2
      ;;
    --voice)
      VOICE="${2:-}"
      shift 2
      ;;
    --rate)
      RATE="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

bridge() {
  local args=()
  if [[ -n "$DEVICE_FILTER" ]]; then
    args+=(--device "$DEVICE_FILTER")
  fi
  WATCHER_PORT="$PORT" node scripts/agentic/cdp-bridge.mjs "${args[@]}" "$@"
}

get_state_json() {
  bridge get-state
}

page_field() {
  local field="$1"
  get_state_json | node -e '
    const field = process.argv[1];
    const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
    const value = data?.pageState?.[field];
    process.stdout.write(JSON.stringify(value));
  ' "$field"
}

wait_for_recording_ready() {
  local timeout="$1"
  local elapsed=0
  while [[ "$elapsed" -lt "$timeout" ]]; do
    local state_json
    state_json="$(get_state_json)"
    local ready
    ready="$(printf '%s' "$state_json" | node -e '
      const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
      const page = data?.pageState || {};
      const isReady = page.recorderIsRecording === true;
      process.stdout.write(isReady ? "true" : "false");
    ')"
    if [[ "$ready" == "true" ]]; then
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  echo "Timed out waiting for live benchmark to become ready" >&2
  get_state_json >&2 || true
  exit 1
}

wait_for_recording_stop() {
  local timeout="$1"
  local elapsed=0
  while [[ "$elapsed" -lt "$timeout" ]]; do
    local state_json
    state_json="$(get_state_json)"
    local stopped
    stopped="$(printf '%s' "$state_json" | node -e '
      const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
      const page = data?.pageState || {};
      const isStopped = page.recorderIsRecording === false;
      process.stdout.write(isStopped ? "true" : "false");
    ')"
    if [[ "$stopped" == "true" ]]; then
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  echo "Timed out waiting for live benchmark to stop" >&2
  get_state_json >&2 || true
  exit 1
}

wait_for_result() {
  local timeout="$1"
  local elapsed=0
  while [[ "$elapsed" -lt "$timeout" ]]; do
    local latest
    latest="$(page_field "latestResult")"
    if [[ "$latest" != "null" ]]; then
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  echo "Timed out waiting for latestResult" >&2
  get_state_json >&2 || true
  exit 1
}

play_source() {
  if [[ -n "$SOURCE_AUDIO_FILE" ]]; then
    if [[ ! -f "$SOURCE_AUDIO_FILE" ]]; then
      echo "Audio file not found: $SOURCE_AUDIO_FILE" >&2
      exit 1
    fi

    local clip_file
    clip_file="$(mktemp /tmp/asr-benchmark-clip-XXXXXX.wav)"
    ffmpeg -v error -y -ss "$START_OFFSET" -t "$PLAY_DURATION" -i "$SOURCE_AUDIO_FILE" \
      -ac 1 -ar 16000 "$clip_file"
    afplay -v "$PLAY_VOLUME" "$clip_file"
    rm -f "$clip_file"
    return 0
  fi

  say -v "$VOICE" -r "$RATE" "$PHRASE"
}

echo "Navigating to ASR benchmark page..."
bridge navigate '/(tabs)/features/asr-benchmark' >/dev/null
bridge press-test-id asr-benchmark-mode-live >/dev/null || true

if [[ "$(page_field "resultsCount")" != "0" ]]; then
  bridge press-test-id asr-benchmark-clear-results >/dev/null || true
fi

echo "Starting live benchmark..."
bridge press-test-id asr-benchmark-start-live >/dev/null
wait_for_recording_ready "$START_TIMEOUT"

sleep "$PRE_SPEECH_DELAY"

osascript -e 'set volume output volume 100' >/dev/null 2>&1 || true
if [[ -n "$SOURCE_AUDIO_FILE" ]]; then
  echo "Playing real audio through host speaker..."
else
  echo "Speaking phrase through host audio..."
fi
play_source

sleep "$POST_SPEECH_DELAY"

echo "Stopping live benchmark..."
bridge press-test-id asr-benchmark-stop-live >/dev/null
wait_for_recording_stop "$START_TIMEOUT"
wait_for_result "$RESULT_TIMEOUT"

echo "Live benchmark result:"
get_state_json | node -e '
  const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
  const page = data?.pageState || {};
  const latest = page.latestResult || {};
  const result = {
    route: data?.route || null,
    model: page.selectedModelName || null,
    transcript: latest.transcript || null,
    error: latest.error || null,
    initMs: latest.initMs ?? null,
    firstPartialMs: latest.firstPartialMs ?? null,
    firstCommitMs: latest.firstCommitMs ?? null,
    sessionMs: latest.sessionMs ?? null,
    partialCount: latest.partialCount ?? null,
    commitCount: latest.commitCount ?? null,
  };
  process.stdout.write(JSON.stringify(result, null, 2));
  process.stdout.write("\n");
'
