# FNode vs Fusion (.NET) — Performance Comparison

Actual benchmark results for FNode (TypeScript/Bun), compared against Fusion (.NET) estimates from `performance-estimate.md`.

**Runtime**: Bun 1.x on Windows 10 (x64)
**Benchmark tool**: Vitest bench (Tinybench)
**Data source**: `fnode/.reports/bench-latest.json` (55 benchmarks across 8 files)
**Date**: 2026-03-01

---

## 1. Cached Computed Call (hot path)

The most critical metric — how fast a `@computed` method returns when the cached value is still consistent.

| Variant | ops/sec | Latency (mean) | Median |
|---|---:|---:|---:|
| `@computed` cache hit (zero-arg) | 1,285,403 | 0.78 μs | 0.70 μs |
| `@computed` cache hit (1 numeric arg) | 1,190,648 | 0.84 μs | 0.80 μs |
| `@computed` cache hit (1 object arg) | 762,117 | 1.31 μs | 1.20 μs |
| baseline: plain async method (zero-arg) | 7,856,858 | 0.13 μs | 0.10 μs |
| baseline: plain async method (1 numeric arg) | 2,668,875 | 0.37 μs | 0.40 μs |

**FNode vs .NET estimate**:
- FNode actual: **0.78–1.31 μs** (780–1310 ns)
- .NET estimate: ~30–50 ns
- **Actual ratio: ~15–25x** (was estimated 5–15x)

The gap is larger than predicted, mainly because the estimate undervalued Promise allocation and AsyncLocalStorage overhead. However, the absolute cost (~1 μs) is still negligible compared to real work (DB calls at 1–10 ms).

**Decorator overhead** (vs plain async): ~6x for zero-arg, ~2.2x for 1-arg, ~3.5x for object-arg.

---

## 2. Invalidation Propagation

### Pure invalidation (no recompute)

**Linear chain** — invalidate root, propagation walks N nodes:

| Chain length | ops/sec | Latency (mean) | Median |
|---|---:|---:|---:|
| 10 nodes | 230,160 | 4.3 μs | 4.0 μs |
| 100 nodes | 23,109 | 43 μs | 40 μs |
| 1,000 nodes | 1,450 | 690 μs | 464 μs |

**Fan-out** — 1 root invalidated, N direct dependants:

| Fan-out | ops/sec | Latency (mean) | Median |
|---|---:|---:|---:|
| 10 dependants | 303,150 | 3.3 μs | 3.1 μs |
| 100 dependants | 29,188 | 34 μs | 27 μs |
| 1,000 dependants | 2,254 | 444 μs | 299 μs |

**Scaling**: Near-linear. Fan-out is faster than linear chains (fewer pointer hops per node).

### Invalidate + Recompute

| Scenario | ops/sec | Latency (mean) | Median |
|---|---:|---:|---:|
| Single invalidate + recompute | 16,293 | 61 μs | 60 μs |
| Chain (depth=4) invalidate + recompute | 8,356 | 120 μs | 113 μs |
| Fan-out (100 leaves) invalidate + recompute | 1,031 | 970 μs | 890 μs |

**FNode vs .NET estimate**:

| Scenario | .NET estimate | FNode actual | Ratio |
|---|---:|---:|---:|
| 1 → 10 dependants | 200–500 ns | 3.3 μs | ~7–16x |
| 1 → 1,000 dependants | 20–50 μs | 444 μs | ~9–22x |

Invalidation propagation is ~10–20x slower than .NET estimates — wider than the predicted 2–3x. The cost is dominated by event dispatching and Set iteration in V8.

---

## 3. Registry Operations

`ComputedRegistry` is a specialized cache keyed by `ComputedInput`.

| Operation | 100 entries | 1,000 entries | 10,000 entries |
|---|---:|---:|---:|
| get() hit (ops/s) | 12,150,740 | 12,534,486 | 11,088,616 |
| get() miss (ops/s) | 14,517,363 | 14,498,033 | 14,557,834 |
| get() stale (ops/s) | 27,542 | 24,825 | 24,607 |
| register+unregister (ops/s) | 25,316 | 24,816 | 24,753 |

| Metric | Value |
|---|---|
| get() hit latency | ~80–90 ns (~12M ops/s) |
| get() miss latency | ~69 ns (~14.5M ops/s) |
| Scaling | Flat across 100–10K entries |

Registry lookups are fast and scale well — Map-based lookup is O(1) as expected.

---

## 4. RPC Round-Trip (in-process linked transport)

| Call type | ops/sec | Latency (mean) | Median |
|---|---:|---:|---:|
| Regular call: `add(a, b)` | 1,323,716 | 0.76 μs | 0.60 μs |
| `@computed` method (hot/cached) | 851,039 | 1.18 μs | 1.10 μs |
| `@computed` method (cold) | 82,921 | 12.1 μs | 9.50 μs |

### Payload size impact

| Payload | ops/sec | Latency (mean) | Median |
|---|---:|---:|---:|
| number | 735,379 | 1.4 μs | 1.1 μs |
| object | 684,238 | 1.5 μs | 1.2 μs |
| 100-element array | 182,255 | 5.5 μs | 5.0 μs |

### RPC invalidation cycle

| Scenario | ops/sec | Latency (mean) | Median |
|---|---:|---:|---:|
| echo (1KB string) | 282,464 | 3.5 μs | 3.4 μs |
| invalidate → re-fetch single value | 87,146 | 11.5 μs | 9.3 μs |

**Note**: These use the in-process `LinkedTransport` (no actual network). Real WebSocket round-trips will be dominated by network latency (50–500 μs+), making the RPC overhead negligible.

**FNode vs .NET estimate**: The estimate predicted 100–300 μs for full RPC (localhost). In-process transport is ~0.76 μs — much faster since there is no serialization/network overhead.

---

## 5. Commander Pipeline

| Scenario | ops/sec | Latency (mean) | Median |
|---|---:|---:|---:|
| baseline: direct handler call | 1,954,072 | 0.51 μs | 0.50 μs |
| `call()` — no invalidation branch | 421,841 | 2.4 μs | 2.2 μs |
| `call()` — with invalidation | 322,830 | 3.1 μs | 2.9 μs |
| nested call (2 levels) | 159,370 | 6.3 μs | 6.1 μs |

**Commander overhead**: ~4.6x vs direct call (0.51 → 2.4 μs). The middleware pipeline, command wrapping, and handler resolution add ~1.9 μs.

---

## 6. Runtime Baselines

Fundamental operation costs in Bun/V8, providing context for the numbers above.

| Operation | ops/sec | Latency (mean) |
|---|---:|---:|
| Map.get() hit | 20,934,674 | 48 ns |
| Map.set() overwrite | 20,400,238 | 49 ns |
| AsyncLocalStorage.getStore() (outside) | 25,294,873 | 40 ns |
| AsyncLocalStorage.getStore() (inside) | 11,494,048 | 87 ns |
| performance.now() | 12,438,034 | 80 ns |
| Date.now() | 11,182,036 | 89 ns |
| Promise.resolve() | 8,149,370 | 123 ns |
| JSON.stringify() small object | 4,771,615 | 210 ns |
| JSON.parse() small object | 2,614,166 | 383 ns |

### ComputedInput construction

| Args | ops/sec | Latency |
|---|---:|---:|
| zero args | 11,705,948 | 85 ns |
| 1 numeric arg | 10,411,932 | 96 ns |
| 1 string arg | 6,370,202 | 157 ns |
| 2 mixed args | 4,151,524 | 241 ns |
| 1 object arg (JSON key) | 1,408,913 | 710 ns |

---

## 7. Estimates vs Actual

Comparing `performance-estimate.md` predictions against measured results.

| Metric | .NET Estimate | FNode Estimate | FNode Actual | Predicted Ratio | Actual Ratio | Verdict |
|---|---:|---:|---:|---:|---:|---|
| Cached call (zero-arg) | 30–50 ns | 250–700 ns | 780 ns | 5–15x | ~16–26x | Wider than predicted |
| Cached call (object-arg) | 30–50 ns | 250–700 ns | 1,310 ns | 5–15x | ~26–44x | Object keys expensive |
| Invalidate 1→10 | 100 ns | 200–500 ns | 3,300 ns | 2–5x | ~33x | Much wider |
| Invalidate 1→1,000 | 10 μs | 20–50 μs | 444 μs | 2–5x | ~44x | Event dispatch costly |
| Registry lookup | 20 ns | 30–50 ns | 80 ns | 1.5–2.5x | ~4x | Slightly wider |
| AsyncLocalStorage | 5 ns | 50–100 ns | 87 ns | 10–20x | ~17x | On target |
| Promise.resolve() | ~0 ns (ValueTask) | 100–300 ns | 123 ns | — | — | Estimate accurate |
| RPC (localhost) | 50–100 μs | 100–300 μs | 0.76 μs* | 2–3x | — | *In-process, not comparable |

\* RPC uses in-process linked transport, not actual WebSocket. Network RPC would be higher.

### Where estimates were accurate
- **AsyncLocalStorage** overhead: predicted 50–100 ns, measured 87 ns
- **Promise.resolve()**: predicted 100–300 ns, measured 123 ns
- **Map.get()**: predicted 30–50 ns, measured 48 ns
- **JSON.stringify()**: predicted included in key hashing, measured 210 ns

### Where estimates were too optimistic
- **Cached @computed call**: predicted 250–700 ns, measured 780–1,310 ns. The combined overhead of ComputedInput construction + registry lookup + AsyncLocalStorage + Promise wrapping stacks up more than anticipated.
- **Invalidation propagation**: predicted 2–5x slower than .NET, actual ~10–40x. Event-based invalidation with TypedEvent dispatch and Set iteration is costlier than estimated.
- **Overall .NET gap**: predicted 5–15x, measured 15–25x for the hot path. The FNode estimate underestimated the cumulative cost of JS runtime primitives.

---

## 8. Summary

### Key takeaways

1. **Cached @computed call: ~0.78 μs (zero-arg)** — the hot path is sub-microsecond. For real workloads avoiding 1–10 ms DB/API calls, this is negligible overhead.

2. **The .NET gap is wider than estimated** (15–25x vs predicted 5–15x), primarily because:
   - Promise allocation is unavoidable in JS (no ValueTask equivalent)
   - Object-arg key serialization (`JSON.stringify` with sorted keys) adds ~700 ns
   - Event-based invalidation is costlier than .NET's lock-free struct-based approach

3. **Registry lookups are fast and flat** — ~12M ops/s regardless of registry size (100–10K entries). The Map-based design scales well.

4. **RPC overhead is minimal** — 0.76 μs for in-process transport. Network latency will dominate in production.

5. **Commander adds ~4.6x overhead** vs direct calls (0.51 → 2.4 μs), which is reasonable for a middleware pipeline.

6. **Invalidation scales linearly** — both chain and fan-out costs grow proportionally to graph size. Fan-out is ~30% faster than chains at equal sizes.

7. **The conclusion from performance-estimate.md still holds**: FNode is slower in microbenchmarks, but the **user-visible performance difference is negligible**. The value proposition — caching computations that cost 1–10 ms — delivers 1,000–10,000x speedup regardless of whether the cache lookup costs 50 ns (.NET) or 780 ns (FNode).
