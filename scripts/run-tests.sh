#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
mkdir -p .reports/history
bunx vitest run
TS=$(date -u +%Y-%m-%dT%H-%M-%S)
cp .reports/test-latest.json ".reports/history/test-${TS}.json"
bun run scripts/generate-report.ts test
