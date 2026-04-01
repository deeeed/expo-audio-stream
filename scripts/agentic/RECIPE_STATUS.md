# Workflow System Status

Last updated: 2026-04-01

This status note tracks the shared Audiolab workflow runner against the original improvement list used to shape the system.

## Current State

The workflow system is feature-complete for the original shipping recommendations.

## Vocabulary

Use these terms consistently:

- `workflow`: the canonical graph format under `validate.workflow`
- `recipe`: a colloquial label for a workflow file executed by `validate-recipe.sh`
- `subflow`: a reusable workflow invoked by `call`
- `node`: an executable or control unit inside `workflow.nodes`
- `transition`: an edge selected by `next`, `switch`, or `default`
- `guard`: the condition on a `switch` case, currently expressed with `when`
- `trace`: the execution record emitted to `trace.json`

Completed:

- Matrix execution is implemented in the shared runner, including a single matrix summary artifact for `ios`, `android`, and `web`.
- Failure artifacts are captured automatically on live step failure, including screenshot, route, app state, recent eval refs, and recent logs.
- Screenshot assertions support baselines, thresholded PNG diffing, diff artifacts, and explicit baseline refresh with `--update-baselines`.
- Assertions are richer than the initial minimal contract and support operators such as `gte`, `lte`, `matches`, `one_of`, `all`, `any`, and `none`.
- The canonical format is a workflow graph with explicit nodes, transitions, `switch` control flow, and composable subflows via `call`.
- `setup`, `teardown`, and pre-condition execution are first-class hooks in the workflow format.
- The bridge and HUD are extracted into a shared `packages/agentic-dev` package and mounted by both `playground` and `sherpa-voice`.
- Flow/schema validation checks known actions, required fields, duplicate ids, pre-condition registration, missing transitions, unreachable nodes, cycles, and undeclared inputs.
- Live runs emit `workflow.json`, `workflow.mmd`, and `trace.json` artifacts, which makes a future workflow viewer straightforward.

## Remaining Polish

These are not blockers for the current system, but they are the main remaining refinement points:

- Screenshot comparison is thresholded PNG diffing, not perceptual diffing. If the project later needs stronger visual regression detection, SSIM or perceptual comparison would be the next upgrade.
- There is no dedicated workflow viewer UI yet. The runner already emits Mermaid and normalized graph artifacts, so the missing part is presentation rather than data.

## Validation Notes

- `playground` is the proven reference app for live workflow execution and matrix validation across `ios`, `android`, and `web`.
- `sherpa-voice` is integrated into the shared system and supports the same recipe structure, bridge, and HUD model.
- When evolving the runner, validate against `playground` first, then extend the same behavior to `sherpa-voice`.

## Recommendation

- Treat the current system as stable enough for day-to-day worker validation and workflow-driven automation.
- Treat the workflow format as the single source of truth for recipe authoring and viewing.
- Only add perceptual image comparison if screenshot churn starts creating false positives that thresholded PNG diffing cannot handle cleanly.
