# External Client Validation Prompt — `~/dev/demo-audiolab`

Use this prompt in `~/dev/demo-audiolab` to validate the beta as an external
consumer.

---

You are validating `@siteed/moonshine.rn` as an **external consumer**, not as
an internal monorepo package.

Project:

- `~/dev/demo-audiolab`

Package under test:

- `@siteed/moonshine.rn@beta`

Your goal is to determine whether a normal client can install and use the
library successfully without relying on hidden monorepo knowledge.

## Rules

- Treat this repo as if you just cloned it.
- Prefer the published beta package, not local workspace linking.
- Keep a running list of every friction point.
- Do not silently fix the library docs in your head — record what was missing.

## Phase 0 — clean consumer baseline

From `~/dev/demo-audiolab`:

```bash
rm -rf node_modules ios android .expo dist
rm -f yarn.lock package-lock.json pnpm-lock.yaml
printf 'nodeLinker: node-modules\n' > .yarnrc.yml
yarn install
```

Install the beta:

```bash
yarn add @siteed/moonshine.rn@beta
```

## Phase 1 — inspect what the package looks like to a client

Verify:

```bash
node -e "console.log(require('@siteed/moonshine.rn/package.json').version)"
node -e "console.log(require('@siteed/moonshine.rn/package.json').files)"
```

Read:

- `node_modules/@siteed/moonshine.rn/README.md`

Judge whether it is sufficient for a new consumer.

## Phase 2 — build a minimal integration

Add a minimal screen or test harness that exercises:

1. package import
2. platform availability check
3. transcriber creation
4. one file-transcription path
5. one intent-recognition path if practical

Prefer a deterministic local sample file instead of live mic first.

Suggested minimum API coverage:

- `getVersion()`
- `createTranscriberFromFiles()` or documented equivalent
- `transcribeWithoutStreaming()` or documented file-transcription helper path
- `createIntentRecognizer()`
- `processUtterance()`

## Phase 3 — platform validation

### iOS

Run the documented iOS setup and build flow.

Record:

- what succeeded immediately
- what required undocumented knowledge
- what was confusing

### Android

Run the documented Android setup and build flow.

Record:

- whether the package links/builds cleanly
- whether the app had to move to `minSdkVersion 35`
- any ORT or native dependency surprises

### Web

Run the documented web setup.

Validate:

- package import works
- web runtime initialization path is understandable
- default model asset behavior matches the docs

## Phase 4 — friction audit

Capture all of the following:

- missing setup steps
- unclear wording in README
- assumptions that only make sense inside the monorepo
- surprising platform-specific limitations
- anything that would block a first-time adopter

## Phase 5 — report

Create:

- `VALIDATION_REPORT_MOONSHINE_BETA.md`

Template:

```md
# Validation Report — @siteed/moonshine.rn beta

## Environment
- Repo: ~/dev/demo-audiolab
- Package version:
- Date:

## What worked
- 

## What failed
- 

## Friction points
- 

## Missing or unclear docs
- 

## Verdict
- Ready for another beta / needs fixes before stable
```

## Success criteria

The validation is successful only if you can answer:

- Can a client install it?
- Can a client build it?
- Can a client transcribe something?
- Can a client understand what is and is not supported?
- Are the docs sufficient without internal context?

---

If the answer to any of those is “not yet”, report the exact blocker.
