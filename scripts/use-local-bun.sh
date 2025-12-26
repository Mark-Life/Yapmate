#!/bin/bash
# Helper script to use locally built Bun from the bun repository
# Usage: ./scripts/use-local-bun.sh <command>
# Example: ./scripts/use-local-bun.sh build

BUN_REPO_PATH="${BUN_REPO_PATH:-/Users/andrey/Code/public/bun}"
LOCAL_BUN="${BUN_REPO_PATH}/build/debug/bun-debug"

if [ ! -f "$LOCAL_BUN" ]; then
  echo "⚠️  Local Bun not found at $LOCAL_BUN"
  echo "   Falling back to system Bun"
  exec bun "$@"
else
  echo "🔧 Using local Bun build: $LOCAL_BUN"
  exec "$LOCAL_BUN" "$@"
fi

