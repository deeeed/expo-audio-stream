# Audiolab recipes

The shared library at `scripts/agentic/recipe` contains Recipe Protocol v1 graphs for Playground and Sherpa Voice. `@farmslot/recipe-runner` owns graph execution, validation, HUD progress and artifact packages. The project adapter uses the existing app bridge for audio, speech and UI probes.

From the repo root:

```sh
yarn recipe list --json
yarn recipe describe playground.record-screen-validation --json
yarn recipe actions transcription --json
yarn recipe:validate
yarn recipe run playground.smoke.navigation --platform web --device web
yarn recipe run sherpa.asr-ui-validate-qwen3 --app sherpa-voice --platform ios --device <slot-device>
```

From either app, `yarn recipe` uses the same runner and selects that app. Recipe ids remain explicit. Native runs require `--platform ios|android` and an assigned device. Set `METRO_PORT` and `CDP_PORT` to the slot values. Web proof can use `CDP_URL` for an isolated browser. The runner refuses broadcast evidence.

`run --dry-run` validates the entire dependency graph without running actions or writing artifacts. `--param key=value` supplies typed parameters. `--matrix web,ios,android` runs each platform into a separate artifact directory. `--step <node>` enters that root node directly, skips preceding actions, stops after the selected node, and still executes teardown. `--update-baselines` explicitly updates a visual baseline. `--no-hud` is available for diagnostics; those captures are not review evidence. Matrix runs discover a separate target for each platform.

Live runs retain `recipe.json`, `recipe-resolution.json`, `resolved-recipes/`, `summary.json`, `trace.json`, `recipe-invocation.json`, and `artifact-manifest.json`. Validate a retained package with:

```sh
farmslot recipe artifacts validate <artifact-dir> --require-runner-provenance
```

App bridge expressions live in `recipe/queries.json`. Recipes call namespaced `audiolab.query` actions for those probes. Flow recipes live under `recipes/<domain>/flows` and use ordinary `call` nodes with explicit parameters. Readiness checks are graph nodes; cleanup uses a disjoint teardown graph.

The CDP, browser, native-log, device and launch scripts remain available for authoring and diagnostics. ASR benchmarks and diarization scoring scripts remain separate tools. They are not recipe executors.

The pack at `farmslot/` uses the existing `audiolab-farm` project id. Its checklists, domain notes and runtime hooks have one canonical home. See `farmslot/README.md` before installing it on a fleet.
