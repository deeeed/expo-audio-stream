#!/bin/bash
# Import the same managed credentials as the existing Audiolab project.
# Keep values off stdout and never load credential files.
export PATH="${HOME}/.asdf/shims:${HOME}/.asdf/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
for key in AUDIOLAB_NPM_TOKEN EAS_PROJECT_ID APPLE_TEAM_ID; do
  if [ -z "${!key:-}" ]; then
    value="$(launchctl getenv "$key" 2>/dev/null || true)"
    if [ -z "$value" ]; then
      value="$(tmux show-environment -g "$key" 2>/dev/null | sed "s/^$key=//" || true)"
    fi
    if [ -n "$value" ]; then export "$key=$value"; fi
  fi
done
unset value key

audiolab_app_root() {
  node "$1/scripts/agentic/lib/runtime-config.cjs" app-root "$1"
}
