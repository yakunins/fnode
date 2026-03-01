#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
mkdir -p .reports/history
bunx vitest bench 2>&1 | tee .reports/bench-latest.txt
TS=$(date -u +%Y-%m-%dT%H-%M-%S)
cp .reports/bench-latest.json ".reports/history/bench-${TS}.json"
cp .reports/bench-latest.txt ".reports/history/bench-${TS}.txt"
bun run scripts/generate-report.ts bench
