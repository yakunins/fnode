#!/usr/bin/env bun
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";

const reportsDir = join(import.meta.dir, "..", ".reports");
const historyDir = join(reportsDir, "history");

const mode = process.argv[2] as "test" | "bench";
if (mode !== "test" && mode !== "bench") {
  console.error("Usage: bun run scripts/generate-report.ts [test|bench]");
  process.exit(1);
}

// ── Shared styles ──────────────────────────────────────────────

const CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1a1a2e; color: #e0e0e0; font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace; font-size: 14px; padding: 24px; max-width: 1200px; margin: 0 auto; }
  h1 { color: #e94560; font-size: 22px; margin-bottom: 16px; }
  h2 { color: #0f3460; background: #e94560; display: inline-block; padding: 4px 12px; margin: 24px 0 12px; font-size: 15px; }
  h3 { color: #16c79a; font-size: 14px; margin: 16px 0 8px; }
  .summary { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
  .stat { background: #16213e; padding: 12px 20px; border-radius: 6px; }
  .stat .label { color: #888; font-size: 11px; text-transform: uppercase; }
  .stat .value { font-size: 24px; font-weight: bold; margin-top: 4px; }
  .stat .value.pass { color: #16c79a; }
  .stat .value.fail { color: #e94560; }
  .stat .value.pend { color: #f5a623; }
  .bar { height: 24px; border-radius: 4px; overflow: hidden; display: flex; margin-bottom: 20px; }
  .bar .pass { background: #16c79a; }
  .bar .fail { background: #e94560; }
  .bar .pend { background: #f5a623; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { text-align: left; padding: 8px 12px; background: #16213e; color: #888; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #0f3460; }
  td { padding: 6px 12px; border-bottom: 1px solid #1a1a3e; }
  tr:hover td { background: #16213e; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: bold; }
  .badge.passed { background: #16c79a22; color: #16c79a; }
  .badge.failed { background: #e9456022; color: #e94560; }
  .badge.pending { background: #f5a62322; color: #f5a623; }
  details { margin-bottom: 4px; }
  details summary { cursor: pointer; padding: 6px 12px; background: #16213e; border-radius: 4px; }
  details summary:hover { background: #1a2a4e; }
  details[open] summary { border-radius: 4px 4px 0 0; }
  .suite-tests { background: #0f1a2e; border-radius: 0 0 4px 4px; padding: 4px 0; }
  .suite-tests td { padding: 4px 12px 4px 32px; font-size: 13px; }
  .dur { color: #888; font-size: 12px; }
  svg { display: block; margin: 8px 0 16px; }
  .chart-container { background: #16213e; border-radius: 6px; padding: 16px; margin-bottom: 16px; }
  .generated { color: #555; font-size: 11px; margin-top: 32px; text-align: center; }
`;

function html(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>${CSS}</style></head>
<body><h1>${title}</h1>${body}
<div class="generated">Generated ${new Date().toISOString()}</div>
</body></html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtDur(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function fmtOps(hz: number): string {
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(2)}M`;
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(2)}K`;
  return hz.toFixed(0);
}

function suiteName(fullPath: string): string {
  const m = fullPath.match(/packages\/(.+)/);
  return m ? m[1] : basename(fullPath);
}

// ── Test Report ────────────────────────────────────────────────

function generateTestReport() {
  const raw = readFileSync(join(reportsDir, "test-latest.json"), "utf-8");
  const data = JSON.parse(raw);

  const passed = data.numPassedTests ?? 0;
  const failed = data.numFailedTests ?? 0;
  const pending = data.numPendingTests ?? 0;
  const total = data.numTotalTests ?? 0;
  const duration = data.testResults?.reduce(
    (sum: number, s: any) => sum + (s.endTime - s.startTime),
    0
  ) ?? 0;

  const pPct = total ? (passed / total) * 100 : 0;
  const fPct = total ? (failed / total) * 100 : 0;
  const pendPct = total ? (pending / total) * 100 : 0;

  let body = `
    <div class="summary">
      <div class="stat"><div class="label">Passed</div><div class="value pass">${passed}</div></div>
      <div class="stat"><div class="label">Failed</div><div class="value fail">${failed}</div></div>
      <div class="stat"><div class="label">Pending</div><div class="value pend">${pending}</div></div>
      <div class="stat"><div class="label">Total</div><div class="value">${total}</div></div>
      <div class="stat"><div class="label">Duration</div><div class="value">${fmtDur(duration)}</div></div>
      <div class="stat"><div class="label">Suites</div><div class="value">${data.numTotalTestSuites ?? 0}</div></div>
    </div>
    <div class="bar">
      ${pPct > 0 ? `<div class="pass" style="width:${pPct}%"></div>` : ""}
      ${fPct > 0 ? `<div class="fail" style="width:${fPct}%"></div>` : ""}
      ${pendPct > 0 ? `<div class="pend" style="width:${pendPct}%"></div>` : ""}
    </div>`;

  // Suite table
  const suites: any[] = data.testResults ?? [];
  for (const suite of suites) {
    const name = suiteName(suite.name);
    const sDur = suite.endTime - suite.startTime;
    const status = suite.status ?? "passed";
    const tests: any[] = suite.assertionResults ?? [];

    body += `<details${status === "failed" ? " open" : ""}>
      <summary>
        <span class="badge ${status}">${status}</span>
        ${esc(name)}
        <span class="dur">${fmtDur(sDur)}</span>
      </summary>
      <div class="suite-tests"><table>`;

    for (const t of tests) {
      const tStatus = t.status ?? "passed";
      body += `<tr>
        <td><span class="badge ${tStatus}">${tStatus}</span></td>
        <td>${esc(t.title)}</td>
        <td class="dur">${fmtDur(t.duration ?? 0)}</td>
      </tr>`;
    }
    body += `</table></div></details>`;
  }

  const out = html("FNode — Test Report", body);
  writeFileSync(join(reportsDir, "test-report.html"), out);
  console.log("✓ Generated .reports/test-report.html");
}

// ── Bench Report ───────────────────────────────────────────────

interface BenchEntry {
  name: string;
  hz: number;
  mean: number;
  min: number;
  max: number;
  p75: number;
  p99: number;
  p999: number;
  rme: number;
  sampleCount: number;
  rank: number;
}

interface BenchGroup {
  fullName: string;
  benchmarks: BenchEntry[];
}

const COLORS = ["#16c79a", "#4db8ff", "#f5a623", "#e94560", "#a855f7", "#ec4899"];

function barChart(benchmarks: BenchEntry[], width: number, barH: number): string {
  const maxHz = Math.max(...benchmarks.map((b) => b.hz));
  if (maxHz === 0) return "";
  const h = benchmarks.length * (barH + 8) + 24;
  let svg = `<svg width="${width}" height="${h}" xmlns="http://www.w3.org/2000/svg">`;

  const labelW = 200;
  const chartW = width - labelW - 80;

  benchmarks.forEach((b, i) => {
    const y = i * (barH + 8) + 4;
    const w = (b.hz / maxHz) * chartW;
    const color = COLORS[i % COLORS.length];
    svg += `<text x="${labelW - 8}" y="${y + barH / 2 + 4}" fill="#e0e0e0" font-size="12" font-family="monospace" text-anchor="end">${esc(b.name)}</text>`;
    svg += `<rect x="${labelW}" y="${y}" width="${Math.max(w, 2)}" height="${barH}" rx="3" fill="${color}" opacity="0.85"/>`;
    svg += `<text x="${labelW + w + 6}" y="${y + barH / 2 + 4}" fill="${color}" font-size="12" font-family="monospace">${fmtOps(b.hz)} ops/s</text>`;
  });

  svg += `</svg>`;
  return svg;
}

function trendChart(
  historyPoints: { label: string; groups: Map<string, Map<string, number>> }[],
  groupName: string,
  benchNames: string[],
  width: number,
  height: number
): string {
  // Collect data per bench name
  const series: { name: string; values: (number | null)[] }[] = [];
  for (const bName of benchNames) {
    const vals = historyPoints.map((p) => p.groups.get(groupName)?.get(bName) ?? null);
    series.push({ name: bName, values: vals });
  }

  const n = historyPoints.length;
  if (n <= 1) {
    if (n === 1) {
      return `<div style="color:#888;font-size:12px;margin:4px 0 12px;">Trend: only 1 data point — need more history runs.</div>`;
    }
    return "";
  }

  const allVals = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const maxV = Math.max(...allVals);
  const minV = Math.min(...allVals);
  const range = maxV - minV || 1;

  const padL = 60, padR = 16, padT = 16, padB = 40;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

  // Grid lines
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = padT + (plotH / gridLines) * i;
    const val = maxV - (range / gridLines) * i;
    svg += `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="#1a2a4e" stroke-width="1"/>`;
    svg += `<text x="${padL - 6}" y="${y + 4}" fill="#666" font-size="10" font-family="monospace" text-anchor="end">${fmtOps(val)}</text>`;
  }

  // X-axis labels (show a few)
  const step = Math.max(1, Math.floor(n / 6));
  for (let i = 0; i < n; i += step) {
    const x = padL + (i / (n - 1)) * plotW;
    const label = historyPoints[i].label;
    svg += `<text x="${x}" y="${height - 6}" fill="#666" font-size="9" font-family="monospace" text-anchor="middle">${esc(label)}</text>`;
  }

  // Lines
  series.forEach((s, si) => {
    const color = COLORS[si % COLORS.length];
    const points: string[] = [];
    s.values.forEach((v, vi) => {
      if (v === null) return;
      const x = padL + (vi / (n - 1)) * plotW;
      const y = padT + plotH - ((v - minV) / range) * plotH;
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    });
    if (points.length > 1) {
      svg += `<polyline points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="2" opacity="0.9"/>`;
    }
    // Dots
    s.values.forEach((v, vi) => {
      if (v === null) return;
      const x = padL + (vi / (n - 1)) * plotW;
      const y = padT + plotH - ((v - minV) / range) * plotH;
      svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${color}"/>`;
    });
  });

  // Legend
  series.forEach((s, si) => {
    const color = COLORS[si % COLORS.length];
    const lx = padL + si * 160;
    svg += `<rect x="${lx}" y="${padT - 12}" width="10" height="10" rx="2" fill="${color}"/>`;
    svg += `<text x="${lx + 14}" y="${padT - 3}" fill="#e0e0e0" font-size="10" font-family="monospace">${esc(s.name)}</text>`;
  });

  svg += `</svg>`;
  return svg;
}

function loadHistory(): { label: string; groups: Map<string, Map<string, number>> }[] {
  if (!existsSync(historyDir)) return [];
  const files = readdirSync(historyDir)
    .filter((f) => f.startsWith("bench-") && f.endsWith(".json"))
    .sort();

  const points: { label: string; groups: Map<string, Map<string, number>> }[] = [];
  for (const f of files) {
    try {
      const raw = readFileSync(join(historyDir, f), "utf-8");
      const data = JSON.parse(raw);
      const groups = new Map<string, Map<string, number>>();
      for (const file of data.files ?? []) {
        for (const g of file.groups ?? []) {
          const gName = g.fullName ?? "";
          const benchMap = new Map<string, number>();
          for (const b of g.benchmarks ?? []) {
            benchMap.set(b.name, b.hz);
          }
          groups.set(gName, benchMap);
        }
      }
      // Extract date from filename: bench-YYYY-MM-DDTHH-MM-SS.json
      const label = f.replace("bench-", "").replace(".json", "").slice(0, 10);
      points.push({ label, groups });
    } catch {
      // skip malformed files
    }
  }
  return points;
}

function generateBenchReport() {
  const raw = readFileSync(join(reportsDir, "bench-latest.json"), "utf-8");
  const data = JSON.parse(raw);

  const allGroups: BenchGroup[] = [];
  for (const file of data.files ?? []) {
    for (const g of file.groups ?? []) {
      allGroups.push({
        fullName: g.fullName ?? "",
        benchmarks: (g.benchmarks ?? []).map((b: any) => ({
          name: b.name,
          hz: b.hz ?? 0,
          mean: b.mean ?? 0,
          min: b.min ?? 0,
          max: b.max ?? 0,
          p75: b.p75 ?? 0,
          p99: b.p99 ?? 0,
          p999: b.p999 ?? 0,
          rme: b.rme ?? 0,
          sampleCount: b.sampleCount ?? 0,
          rank: b.rank ?? 0,
        })),
      });
    }
  }

  const history = loadHistory();

  let body = `<div class="summary">
    <div class="stat"><div class="label">Groups</div><div class="value">${allGroups.length}</div></div>
    <div class="stat"><div class="label">Benchmarks</div><div class="value">${allGroups.reduce((s, g) => s + g.benchmarks.length, 0)}</div></div>
  </div>`;

  for (const group of allGroups) {
    const shortName = group.fullName.split(" > ").pop() ?? group.fullName;
    body += `<h2>${esc(shortName)}</h2>`;

    // Bar chart
    const sorted = [...group.benchmarks].sort((a, b) => b.hz - a.hz);
    body += `<div class="chart-container">${barChart(sorted, 800, 22)}</div>`;

    // Stats table
    body += `<table>
      <tr><th>Name</th><th>ops/sec</th><th>Mean</th><th>Min</th><th>Max</th><th>p75</th><th>p99</th><th>p999</th><th>RME</th><th>Samples</th></tr>`;
    for (const b of sorted) {
      body += `<tr>
        <td>${esc(b.name)}</td>
        <td style="color:${COLORS[sorted.indexOf(b) % COLORS.length]}">${fmtOps(b.hz)}</td>
        <td class="dur">${fmtDur(b.mean)}</td>
        <td class="dur">${fmtDur(b.min)}</td>
        <td class="dur">${fmtDur(b.max)}</td>
        <td class="dur">${fmtDur(b.p75)}</td>
        <td class="dur">${fmtDur(b.p99)}</td>
        <td class="dur">${fmtDur(b.p999)}</td>
        <td class="dur">±${b.rme.toFixed(2)}%</td>
        <td>${b.sampleCount.toLocaleString()}</td>
      </tr>`;
    }
    body += `</table>`;

    // Trend chart
    if (history.length > 0) {
      const benchNames = group.benchmarks.map((b) => b.name);
      body += `<h3>Trend</h3>`;
      body += `<div class="chart-container">${trendChart(history, group.fullName, benchNames, 800, 200)}</div>`;
    }
  }

  const out = html("FNode — Benchmark Report", body);
  writeFileSync(join(reportsDir, "bench-report.html"), out);
  console.log("✓ Generated .reports/bench-report.html");
}

// ── Main ───────────────────────────────────────────────────────

mkdirSync(reportsDir, { recursive: true });

if (mode === "test") {
  generateTestReport();
} else {
  generateBenchReport();
}
