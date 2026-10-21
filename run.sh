#!/usr/bin/env bash
# Start the caller. Creates the venv and installs edge-tts on first run.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -x .venv/bin/python ]; then
  echo "creating .venv…"
  python3 -m venv .venv
  ./.venv/bin/pip install -q --disable-pip-version-check -r requirements.txt
fi

exec ./.venv/bin/python server.py "$@"
