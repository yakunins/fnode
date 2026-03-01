# FNode — Benchmark Report

**Runtime**: Bun on win32 (x64)
**Benchmark tool**: Vitest bench (Tinybench)
**Groups**: 26 | **Benchmarks**: 72
**Generated**: 2026-03-01

---

## Commander pipeline

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| baseline: direct handler call | 1,991,625 | 502 ns | 500 ns | 700 ns | 995,813 |
| call() — no invalidation branch | 436,918 | 2.3 μs | 2.2 μs | 3.6 μs | 218,460 |
| call() — with invalidation | 330,397 | 3.0 μs | 2.9 μs | 4.7 μs | 165,199 |

## Commander nested commands

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| nested call (2 levels) | 162,698 | 6.1 μs | 6.1 μs | 7.0 μs | 81,350 |

## ComputedInput construction

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| zero args | 11,839,902 | 84 ns | 100 ns | 200 ns | 5,919,951 |
| 1 numeric arg | 10,585,178 | 94 ns | 100 ns | 200 ns | 5,292,590 |
| 1 string arg | 6,575,992 | 152 ns | 200 ns | 200 ns | 3,287,996 |
| 2 mixed args (number + string) | 4,124,491 | 242 ns | 300 ns | 400 ns | 2,062,246 |
| 1 object arg (sorted-keys JSON) | 1,408,053 | 710 ns | 700 ns | 900 ns | 704,027 |

## ComputedInput vs raw Map baseline

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| baseline: raw Map.get() with pre-computed key | 21,076,010 | 47 ns | 100 ns | 100 ns | 10,538,005 |
| ComputedInput + Map.get() | 7,686,904 | 130 ns | 200 ns | 200 ns | 3,843,452 |

## runtime baselines

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| Map.get() hit | 20,761,112 | 48 ns | 100 ns | 100 ns | 10,380,558 |
| Map.set() overwrite | 20,302,964 | 49 ns | 100 ns | 100 ns | 10,151,482 |
| performance.now() | 12,466,154 | 80 ns | 100 ns | 100 ns | 6,233,078 |
| Date.now() | 11,308,744 | 88 ns | 100 ns | 100 ns | 5,654,373 |
| Promise.resolve() | 8,027,336 | 125 ns | 100 ns | 200 ns | 4,013,669 |
| JSON.stringify() small object | 4,997,984 | 200 ns | 200 ns | 300 ns | 2,498,992 |
| JSON.parse() small object | 2,638,257 | 379 ns | 400 ns | 500 ns | 1,319,129 |

## @computed cache hit vs plain async

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| baseline: plain async method (zero-arg) | 7,364,329 | 136 ns | 100 ns | 300 ns | 3,682,165 |
| baseline: plain async method (1 numeric arg) | 2,652,431 | 377 ns | 400 ns | 600 ns | 1,326,216 |
| baseline: plain async method (1 object arg) | 2,557,749 | 391 ns | 400 ns | 700 ns | 1,278,875 |
| @computed cache hit (zero-arg) | 1,286,724 | 777 ns | 800 ns | 1.2 μs | 643,362 |
| @computed cache hit (1 numeric arg) | 1,206,326 | 829 ns | 800 ns | 1.3 μs | 603,163 |
| @computed cache hit (1 object arg) | 787,600 | 1.3 μs | 1.2 μs | 1.9 μs | 393,800 |

## AsyncLocalStorage overhead

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| getStore() outside context | 25,278,207 | 40 ns | 100 ns | 100 ns | 12,639,106 |
| getStore() inside context | 11,360,914 | 88 ns | 100 ns | 200 ns | 5,680,458 |

## computed lifecycle

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| cache hit + invalidate + re-register | 1,284,425 | 779 ns | 800 ns | 1.2 μs | 642,213 |
| create + setOutput + register | 727,987 | 1.4 μs | 1.2 μs | 2.2 μs | 363,996 |

## @computed method lifecycle

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| hot call (cache hit) | 1,130,893 | 884 ns | 800 ns | 1.2 μs | 565,447 |
| cold call (no cache) | 193,805 | 5.2 μs | 4.8 μs | 7.3 μs | 96,903 |

## capture() + whenInvalidated()

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| capture() a @computed method | 162,728 | 6.1 μs | 5.5 μs | 7.5 μs | 81,416 |

## registry size = 100

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| get() miss | 14,548,002 | 69 ns | 100 ns | 100 ns | 7,274,001 |
| get() hit (consistent) | 11,716,806 | 85 ns | 100 ns | 100 ns | 5,858,404 |
| get() stale (invalidated, triggers lazy delete) | 27,568 | 36 μs | 48 μs | 58 μs | 13,785 |
| register() + unregister() cycle | 25,336 | 39 μs | 50 μs | 61 μs | 12,669 |

## registry size = 1000

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| get() miss | 14,690,632 | 68 ns | 100 ns | 100 ns | 7,345,316 |
| get() hit (consistent) | 11,962,902 | 84 ns | 100 ns | 100 ns | 5,981,451 |
| get() stale (invalidated, triggers lazy delete) | 24,700 | 40 μs | 51 μs | 61 μs | 12,350 |
| register() + unregister() cycle | 24,605 | 41 μs | 51 μs | 61 μs | 12,303 |

## registry size = 10000

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| get() miss | 14,883,606 | 67 ns | 100 ns | 100 ns | 7,441,803 |
| get() hit (consistent) | 12,231,840 | 82 ns | 100 ns | 100 ns | 6,115,921 |
| register() + unregister() cycle | 24,731 | 40 μs | 51 μs | 61 μs | 12,366 |
| get() stale (invalidated, triggers lazy delete) | 24,453 | 41 μs | 52 μs | 61 μs | 12,227 |

## throughput (100 keys)

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| baseline: plain Map cache reads | 2,428,772 | 412 ns | 400 ns | 700 ns | 1,214,386 |
| @computed reads (0% invalidation) | 1,074,437 | 931 ns | 900 ns | 1.6 μs | 537,219 |
| @computed reads (1% invalidation) | 224,917 | 4.4 μs | 4.3 μs | 6.5 μs | 112,459 |
| @computed reads (10% invalidation) | 222,362 | 4.5 μs | 4.4 μs | 6.9 μs | 111,181 |

## throughput (1000 keys)

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| baseline: plain Map cache reads | 2,435,658 | 411 ns | 400 ns | 600 ns | 1,217,829 |
| @computed reads (0% invalidation) | 1,045,219 | 957 ns | 1000 ns | 1.4 μs | 522,610 |
| @computed reads (10% invalidation) | 233,362 | 4.3 μs | 3.8 μs | 7.0 μs | 116,682 |
| @computed reads (1% invalidation) | 224,733 | 4.4 μs | 4.3 μs | 6.6 μs | 112,367 |

## @computed cache hit

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| cached call (no args) | 1,716,322 | 583 ns | 600 ns | 1000 ns | 858,161 |
| cached call (string arg) | 1,066,233 | 938 ns | 900 ns | 1.4 μs | 533,117 |

## @computed cold compute

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| first call (no cache) | 192,612 | 5.2 μs | 4.4 μs | 7.1 μs | 96,307 |

## invalidation

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| invalidate + recompute single | 15,985 | 63 μs | 74 μs | 132 μs | 7,994 |

## transitive invalidation chain (depth=4)

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| invalidate base → recompute level3 | 8,546 | 117 μs | 143 μs | 171 μs | 4,273 |

## fan-out invalidation

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| invalidate root → recompute 100 leaves | 1,045 | 957 μs | 1.0 ms | 2.7 ms | 523 |

## ComputedRegistry lookup

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| cache hit among 100 entries | 1,033,981 | 967 ns | 900 ns | 1.4 μs | 516,991 |

## invalidation: linear chain

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| linear chain (10 nodes) — invalidate root | 214,165 | 4.7 μs | 4.2 μs | 27 μs | 107,083 |
| linear chain (100 nodes) — invalidate root | 23,194 | 43 μs | 42 μs | 109 μs | 11,598 |
| linear chain (1000 nodes) — invalidate root | 1,274 | 785 μs | 1.2 ms | 1.7 ms | 637 |

## invalidation: fan-out

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| fan-out (1 root → 10 dependants) — invalidate root | 297,871 | 3.4 μs | 3.3 μs | 5.0 μs | 148,936 |
| fan-out (1 root → 100 dependants) — invalidate root | 27,361 | 37 μs | 30 μs | 79 μs | 13,681 |
| fan-out (1 root → 1000 dependants) — invalidate root | 2,110 | 474 μs | 694 μs | 1.1 ms | 1,055 |

## RPC round-trip (linked transport)

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| regular call: add(a, b) | 1,394,004 | 717 ns | 800 ns | 1.5 μs | 697,002 |
| compute call: @computed method (hot) | 786,895 | 1.3 μs | 1.2 μs | 2.7 μs | 393,448 |
| compute call: @computed method (cold) | 78,626 | 13 μs | 11 μs | 44 μs | 39,313 |

## RPC payload size

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| small payload (number) | 758,452 | 1.3 μs | 1.2 μs | 2.8 μs | 379,226 |
| medium payload (object) | 727,467 | 1.4 μs | 1.2 μs | 2.4 μs | 363,734 |
| large payload (100-element array) | 179,936 | 5.6 μs | 5.3 μs | 6.9 μs | 89,969 |

## RPC invalidation + re-fetch (linked transport)

| Name | ops/sec | Latency (mean) | Median | p99 | Samples |
|---|---:|---:|---:|---:|---:|
| echo (1KB string) | 277,881 | 3.6 μs | 3.6 μs | 4.3 μs | 138,941 |
| invalidate → re-fetch single value | 84,225 | 12 μs | 12 μs | 20 μs | 42,113 |

---

*Generated 2026-03-01T18:51:41.978Z*