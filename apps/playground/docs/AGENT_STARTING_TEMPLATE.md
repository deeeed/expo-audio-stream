# Agent Starting Template

Zero-prose mission briefing. Follow steps in order.

All commands run from `apps/playground/`.

---

## Step 1 — Verify app is running

```bash
node scripts/agentic/cdp-bridge.mjs list-devices
```

**0 devices returned:**

| Situation | Command |
|-----------|---------|
| App installed, just needs Metro | `scripts/agentic/start-metro.sh` |
| Android first run / fresh install | `yarn android` (builds + installs + starts Metro on :7365) |
| iOS first run / fresh install | `yarn setup:ios-simulator && yarn ios` |
| Web | `node scripts/agentic/web-browser.mjs launch & && scripts/agentic/start-metro.sh` |

---

## Step 2 — Define your feedback loop

Pick the channels relevant to this task:

| Channel | When to use | Command |
|---------|-------------|---------|
| JS/Hermes logs | React crashes, JS state bugs | `scripts/agentic/app-state.sh eval "..."` |
| Native logs | Kotlin/Swift crashes, audio pipeline | `scripts/agentic/native-logs.sh android\|ios` |
| Screenshots | UI layout, visual regression | `scripts/agentic/screenshot.sh <label>` |
| State polling | Recording in progress | `scripts/agentic/app-state.sh state` |

---

## Step 3 — Baseline

Before any change:
```bash
scripts/agentic/app-navigate.sh "/(tabs)/record"
scripts/agentic/screenshot.sh baseline
```

---

## Step 4 — Implement

- Read the file before editing
- Minimal diff — no unsolicited changes
- After each edit: `scripts/agentic/reload-metro.sh`

---

## Step 5 — Validate

**JS features:**
```bash
scripts/agentic/app-state.sh eval "__AGENTIC__.startRecording({ sampleRate: 44100, channels: 1 })"
scripts/agentic/app-state.sh state
scripts/agentic/app-state.sh eval "__AGENTIC__.stopRecording()"
```

**If native code was touched:**
```bash
scripts/agentic/native-logs.sh android   # look for ERROR / Exception
scripts/agentic/native-logs.sh ios
```

**Visual confirmation:**
```bash
scripts/agentic/screenshot.sh post-change
```

---

## Step 6 — Type-check

| Scope | Command | Speed |
|-------|---------|-------|
| Single package | `yarn workspace @siteed/<pkg> build` | ~1.5s |
| Cross-package | `yarn typecheck && yarn lint:fix` | slow |

---

## Step 7 — Done criteria

- [ ] Works on ≥1 platform (real device or simulator)
- [ ] No JS errors in CDP output
- [ ] No native ERRORs in `native-logs` (if native code was touched)
- [ ] Screenshot confirms expected UI
- [ ] TypeScript / lint clean

---

## Ask me when

- Requirements are ambiguous
- A protected file needs changing (`scripts/agentic/`, `.detoxrc.js`, root `/index.js`)
- A native build is required (pod install / gradle sync)
- Task scope expands beyond the original request

---

## Multi-device targeting

```bash
# Auto-selects when exactly 1 device connected (no flag needed)
scripts/agentic/app-state.sh state

# Explicit targeting when 2+ devices connected
scripts/agentic/app-state.sh --device "Pixel 6a" state
scripts/agentic/app-navigate.sh --device "iPhone" "/(tabs)/record"
scripts/agentic/screenshot.sh --device "Pixel 6a" my-label android
```
