# FNode vs Fusion (.NET) — Performance Estimates

Estimates based on runtime characteristics of Bun/V8 vs .NET 10. These are projections, not benchmarks — actual numbers will be validated in Phase 1.

---

## Cached Computed Call (hot path)

The most critical metric — how fast a `@computed` method returns when the cached value is still consistent.

| Step | Fusion (.NET) | FNode (Bun/V8) | Why |
|---|---|---|---|
| Compute cache key from args | ~5ns (struct-based, no alloc) | ~50-200ns (object hash, serialization) | JS has no value types; args need serialization for stable key |
| Registry lookup | ~20ns (ConcurrentDictionary) | ~30-50ns (Map.get) | V8 Map is fast, but no lock-free concurrent dict needed (single thread) |
| Consistency check | ~2ns (enum compare) | ~2-5ns (property access) | Trivial in both |
| AsyncLocalStorage read | N/A (.NET AsyncLocal ~5ns) | ~50-100ns | Node/Bun AsyncLocalStorage has measurable overhead per access |
| Dependency registration | ~5ns (add to HashSet) | ~10-20ns (Set.add) | Similar |
| Promise/Task creation | ~0ns (ValueTask, sync completion) | ~100-300ns (Promise always allocates) | JS has no ValueTask equivalent; even sync results create Promise objects |
| **Total cached call** | **~30-50ns** | **~250-700ns** | **~5-15x slower** |
| **Allocations per call** | ~1 (or 0 with ValueTask) | ~3-5 (Promise, closure, key string) | JS GC handles this fine at moderate throughput |

**Relative speedup vs uncached**: Both achieve massive speedups. A DB call takes ~1-10ms. A cached Fusion call saves ~1-10ms regardless of whether the cache lookup costs 50ns or 500ns. The **user-visible** performance gain is nearly identical.

---

## Invalidation Propagation

| Scenario | Fusion (.NET) | FNode (Bun/V8) | Notes |
|---|---|---|---|
| Invalidate 1 computed (no dependants) | ~10ns | ~20-50ns | Set state + fire event |
| Invalidate 1 → 10 dependants | ~100ns | ~200-500ns | Walk graph, fire events |
| Invalidate 1 → 1,000 dependants (fan-out) | ~10μs | ~20-50μs | Graph traversal dominates, similar algorithmic cost |
| Invalidate 1 → 10,000 dependants | ~100μs | ~200-500μs | May need batching in both |

**Key difference**: .NET can parallelize graph walks across threads. Bun is single-threaded — large fan-outs block the event loop. Mitigation: chunk invalidation walks with `setImmediate` / `queueMicrotask` for graphs > 1,000 nodes.

---

## Memory Per Computed Instance

| Component | Fusion (.NET) | FNode (Bun/V8) | Notes |
|---|---|---|---|
| Computed object | ~64-96 bytes (class, fields packed) | ~150-300 bytes (JS object overhead, hidden class) | V8 objects have higher baseline overhead |
| Dependency set (usedBy) | ~40 bytes (HashSet base) | ~80-120 bytes (Set base) | Similar scaling per entry |
| Cache key (ComputedInput) | ~32 bytes (struct) | ~100-200 bytes (string key + references) | Biggest gap — no value types in JS |
| Result wrapper | ~16 bytes (struct) | ~50-80 bytes (object) | |
| **Total per instance** | **~150-250 bytes** | **~400-700 bytes** | **~2-3x more memory** |

At 100K active computeds: .NET ~25MB, Bun ~70MB. Both fine for server workloads.

---

## RPC Round-Trip (client ↔ server)

| Metric | Fusion (.NET) | FNode (Bun/V8) | Notes |
|---|---|---|---|
| Serialization (MemoryPack / JSON) | ~100ns-1μs | ~1-10μs | MemoryPack is fastest .NET serializer; FNode uses JSON currently (pluggable `RpcSerializer` interface allows future binary formats) |
| WebSocket frame send | ~5-20μs | ~5-20μs | Similar — OS/network dominated |
| Full RPC call (localhost) | ~50-100μs | ~100-300μs | Serialization overhead is main gap |
| Invalidation push (server → client) | ~10-50μs | ~20-100μs | Small message, similar |
| Reconnect + state recovery | ~100-500ms | ~100-500ms | Network dominated, runtime doesn't matter |

**Verdict**: RPC performance is network-bound. The serialization gap (~5-10x) is invisible at network latencies.

---

## Concurrency / Throughput

| Scenario | Fusion (.NET) | FNode (Bun/V8) | Notes |
|---|---|---|---|
| Concurrent cached calls (1 thread) | ~20M/sec | ~2-5M/sec | Single-core, memory access patterns |
| Concurrent cached calls (multi-core) | ~100M+/sec (scales with cores) | ~2-5M/sec (single-threaded) | Biggest structural gap — JS is single-threaded |
| Concurrent RPC clients (per server) | ~10K+ connections | ~10K+ connections | Both handle high connection counts well |
| Requests/sec (real-world, mixed) | ~100K-500K/sec | ~20K-100K/sec | .NET thread pool vs Bun event loop |

**Mitigation**: For CPU-heavy workloads, Bun can use `worker_threads` or cluster mode. The computed registry is per-isolate, so multi-worker setups need cross-worker invalidation (Phase 3+).

---

## Summary

| Metric | .NET Advantage | Impact on FNode | Mitigation |
|---|---|---|---|
| Cached call latency | ~5-15x faster | Low — both sub-μs, invisible vs real work | Optimize key hashing, minimize allocations |
| Memory per computed | ~2-3x less | Low — sub-100MB even at scale | LRU eviction, WeakRef, shorter TTLs |
| Serialization | ~5-10x faster | Low — network latency dominates | Use MessagePack, avoid JSON on hot paths |
| Multi-core throughput | ~10-20x more | Medium — matters for CPU-bound servers | worker_threads / cluster mode |
| Invalidation fan-out | ~2-3x faster | Low — sub-ms for typical graphs | Chunk large walks to avoid blocking event loop |
| GC predictability | More predictable | Medium — WeakRef timing is non-deterministic | Explicit TTL/LRU alongside WeakRef |

**Bottom line**: FNode will be ~5-15x slower than Fusion in microbenchmarks, but **the user-visible performance difference is negligible** for the primary use case (caching expensive computations and syncing state). The speedup ratio — cached vs uncached — remains massive (1,000-10,000x) because the cost being avoided (DB/API calls, recomputation) dwarfs the cache overhead in either runtime. The main gap is multi-core throughput, which matters only for high-scale CPU-bound servers.
