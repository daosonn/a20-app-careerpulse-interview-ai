#!/usr/bin/env bash
# Pre-push evaluation gate for CareerPulse
# Runs a fast smoke-test eval (10 samples, CV Deep-dive phase) before push.
# Install: cp scripts/pre_push_eval.sh .git/hooks/pre-push && chmod +x .git/hooks/pre-push

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
VENV="$REPO_ROOT/venv"

echo "[eval] Running pre-push evaluation gate …"

# Activate venv if present
if [ -f "$VENV/bin/activate" ]; then
  source "$VENV/bin/activate"
fi

# Install eval deps if ragas is missing
python -c "import ragas" 2>/dev/null || pip install -q -r "$BACKEND_DIR/eval/requirements.txt"

cd "$BACKEND_DIR"

# Run a fast subset: CV Deep-dive phase only (10 samples) with stricter timeout
python -m eval.run_eval --phase "CV Deep-dive"

echo "[eval] Gate passed. Proceeding with push."
