# Agentic Recipe System

The shared recipe runner lives in [`scripts/agentic`](./). App-specific recipe data lives with each app under:

Implementation status is tracked in [`RECIPE_STATUS.md`](./RECIPE_STATUS.md).

```text
apps/<app>/scripts/agentic/teams/<team>/
  flows/
  recipes/
  evals/
  evals.json
  pre-conditions.js
```

The shared validator and runner are repo-root scripts:

- `scripts/agentic/validate-recipe.sh`
- `scripts/agentic/validate-flow-schema.js`
- `scripts/agentic/validate-pre-conditions.js`

Each app exposes thin wrappers so Farmslot or local agents can run them from the app directory:

- `bash scripts/agentic/validate-recipe.sh scripts/agentic/teams/<team>/recipes/<recipe>.json`
- `bash scripts/agentic/validate-flow-schema.sh`
- `bash scripts/agentic/validate-pre-conditions.sh`

During live execution, the runner publishes the active step into an in-app HUD overlay by default.
Use `--no-hud` with `validate-recipe.sh` to disable it.

Useful flags:

- `--matrix ios,android,web` runs the same recipe sequentially across the selected platforms and writes a single matrix summary.
- `--update-baselines` refreshes screenshot baseline files for `screenshot` steps that declare `baseline`.
- `--artifacts-dir <path>` overrides the default `.agent/recipe-runs/...` artifact location.

Recipe conventions:

- Flows and recipes use `validate.workflow`. It is a graph/state-machine format with `entry`, `nodes`, explicit `next` transitions, `switch` nodes, and `end` nodes.
- Optional `setup`, `teardown`, and `pre_conditions` hooks live under `validate.workflow.setup`, `validate.workflow.teardown`, and `validate.workflow.pre_conditions`.
- `eval_sync`, `eval_async`, and `eval_ref` steps must assert.
- `flow_ref` is the main composition primitive. Use it to call reusable subflows from larger workflows.
- `flow_ref` and `eval_ref` can omit the team prefix when the current file already lives inside `teams/<team>/...`.
- Pre-condition entries should include `fixtures.pass` and `fixtures.fail` so they can be validated offline.

Failure behavior:

- Any failed live step captures a screenshot, current route, current app state, recent eval refs, and recent `.agent` logs into a per-run artifact directory.
- Successful runs also write `summary.json`, `trace.json`, `workflow.json`, and `workflow.mmd`, and matrix runs additionally write `matrix-summary.json`.
- `workflow.mmd` is Mermaid output so a future viewer can render the exact workflow graph taken by the runner.

Screenshot assertions:

- `screenshot` steps can declare `baseline`, `max_diff_pixels`, `max_diff_ratio`, and `pixel_threshold`.
- Missing baselines fail by default. Use `--update-baselines` to create or refresh them intentionally.

Example:

```json
{
  "validate": {
    "workflow": {
      "entry": "choose-platform",
      "nodes": {
        "choose-platform": {
          "action": "switch",
          "cases": [
            {
              "label": "web",
              "when": { "operator": "eq", "field": "env.platform", "value": "web" },
              "next": "open-record"
            }
          ],
          "default": "open-record"
        },
        "open-record": {
          "action": "flow_ref",
          "ref": "record-screen-smoke",
          "next": "assert-route"
        },
        "assert-route": {
          "action": "eval_ref",
          "ref": "route",
          "assert": { "operator": "eq", "field": "pathname", "value": "/record" },
          "next": "done"
        },
        "done": {
          "action": "end",
          "status": "pass"
        }
      }
    }
  }
}
```
