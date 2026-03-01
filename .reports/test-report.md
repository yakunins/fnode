# FNode — Test Report

**Runtime**: Bun on win32 (x64)
**Test runner**: Vitest
**Generated**: 2026-03-01

| Passed | Failed | Skipped | Total | Suites | Duration |
|---:|---:|---:|---:|---:|---:|
| 261 | 0 | 5 | 266 | 81 | 4.86s |

---

## auth/__tests__/auth.test.ts

**passed** — 7.5ms

| Status | Test | Duration |
|---|---|---:|
| PASS | creates session with given id | 745µs |
| PASS | creates session with random UUID | 1.7ms |
| PASS | toString includes id | 116µs |
| PASS | returns undefined for unknown session | 1.4ms |
| PASS | signIn stores user and session | 589µs |
| PASS | signOut removes user and session | 1.1ms |
| PASS | getUser is @computed — returns cached value | 368µs |
| PASS | signIn invalidates cached getUser | 454µs |
| PASS | supports multiple sessions | 549µs |

## commandr/__tests__/command-context.test.ts

**passed** — 17.2ms

| Status | Test | Duration |
|---|---|---:|
| PASS | is undefined outside of a command | 813µs |
| PASS | provides ambient access within run() | 601µs |
| PASS | propagates through async chains | 14.6ms |
| PASS | supports nesting with outerContext link | 556µs |
| PASS | shares items bag with nested contexts | 206µs |

## commandr/__tests__/command-handler.test.ts

**passed** — 3.7ms

| Status | Test | Duration |
|---|---|---:|
| PASS | attaches handler metadata via COMMAND_HANDLER symbol | 1.9ms |
| PASS | handler fn is bound to the service instance | 246µs |
| PASS | stores target reference to service instance | 106µs |
| PASS | supports multiple handlers on one service | 565µs |
| PASS | preserves priority from decorator argument | 125µs |
| PASS | different instances have independent handler metadata | 683µs |

## commandr/__tests__/commander.test.ts

**passed** — 7.2ms

| Status | Test | Duration |
|---|---|---:|
| PASS | resolves and executes a handler | 2.1ms |
| PASS | returns typed result from handler | 342µs |
| PASS | throws for unknown command type | 1.3ms |
| PASS | supports addHandler() for inline handler registration | 546µs |
| PASS | addService() scans all @commandHandler methods | 594µs |
| PASS | sets CommandContext.current during handler execution | 269µs |
| PASS | middleware filters execute in priority order (descending) | 633µs |
| PASS | nested commands create linked contexts | 420µs |
| PASS | nested commands share items bag | 460µs |
| PASS | addService with no handlers does not throw | 233µs |

## commandr/__tests__/invalidation.test.ts

**passed** — 99.9ms

| Status | Test | Duration |
|---|---|---:|
| PASS | automatically invalidates @computed after command | 2.4ms |
| PASS | Invalidation.isActive is true during invalidation phase | 401µs |
| PASS | invalidates multiple keys in one command | 689µs |
| PASS | transitive invalidation cascades through dependency graph | 752µs |
| PASS | works with capture() for reactive observation | 647µs |
| PASS | works with ComputedState for auto-updating loop | 93.9ms |
| PASS | cart service: add items and auto-invalidate | 893µs |
| PASS | command without invalidation branch still executes | 335µs |

## core/__tests__/async-lock-set.test.ts

**passed** — 339.2ms

| Status | Test | Duration |
|---|---|---:|
| PASS | different keys do not block each other | 58.0ms |
| PASS | same key serializes access | 45.6ms |
| PASS | cleans up entries when no longer in use | 457µs |
| PASS | concurrent workers on same key: counter is serialized | 152.1ms |
| PASS | mixed concurrent keys: different keys run in parallel, same keys serialize | 81.3ms |
| PASS | abort cancels waiting for keyed lock | 1.2ms |

## core/__tests__/async-lock.test.ts

**passed** — 278.5ms

| Status | Test | Duration |
|---|---|---:|
| PASS | allows sequential access | 1.6ms |
| PASS | serializes concurrent access | 71.3ms |
| PASS | reports locked state | 368µs |
| PASS | double dispose is safe | 322µs |
| PASS | concurrent workers: shared counter is serialized | 152.3ms |
| PASS | abort cancels waiting for lock | 1.5ms |
| PASS | FIFO ordering of waiters | 255µs |
| PASS | lock held across await points | 50.4ms |
| PASS | stress: 50 concurrent lock attempts all resolve | 458µs |

## core/__tests__/computed-input.test.ts

**passed** — 4.1ms

| Status | Test | Duration |
|---|---|---:|
| PASS | same service + method + args produce equal keys | 951µs |
| PASS | different args produce different keys | 172µs |
| PASS | different methods produce different keys | 113µs |
| PASS | different services produce different keys | 320µs |
| PASS | same service instance gets same id across calls | 174µs |
| PASS | handles object args with stable key (sorted keys) | 172µs |
| PASS | handles no args | 200µs |
| PASS | handles null and undefined args | 316µs |
| PASS | handles number, boolean, bigint args | 454µs |
| PASS | array args produce stable keys (order matters) | 856µs |
| PASS | nested object args produce stable keys (deep sorted) | 144µs |

## core/__tests__/events.test.ts

**passed** — 5.0ms

| Status | Test | Duration |
|---|---|---:|
| PASS | fires to subscribers | 1.5ms |
| PASS | unsubscribes via dispose | 344µs |
| PASS | once fires only once | 193µs |
| PASS | next() returns promise for next fire | 391µs |
| PASS | hasHandlers reflects subscription state | 227µs |
| PASS | clear removes all handlers | 230µs |
| PASS | multiple subscribers all receive same event | 339µs |
| PASS | unsubscribe during fire does not break iteration | 1.0ms |

## core/__tests__/result.test.ts

**passed** — 4.3ms

| Status | Test | Duration |
|---|---|---:|
| PASS | ok: holds value | 1.4ms |
| PASS | err: holds error | 232µs |
| PASS | err: accessing .value throws | 563µs |
| PASS | from: captures success | 333µs |
| PASS | from: captures error | 183µs |
| PASS | fromAsync: captures async success | 140µs |
| PASS | fromAsync: captures async error | 278µs |
| PASS | from: wraps non-Error throws | 171µs |
| PASS | from: wraps non-Error thrown values (number, object, symbol) | 409µs |
| PASS | err: accessing .value re-throws the exact same error instance | 128µs |
| PASS | ok: stores falsy values correctly (0, empty string, false, null, undefined) | 313µs |

## core/__tests__/version-generator.test.ts

**passed** — 2.2ms

| Status | Test | Duration |
|---|---|---:|
| PASS | starts at 0 | 970µs |
| PASS | returns strictly increasing values | 276µs |
| PASS | independent generators are independent | 167µs |

## fusion/__tests__/capture.test.ts

**passed** — 9.2ms

| Status | Test | Duration |
|---|---|---:|
| PASS | captures a computed and its value | 3.4ms |
| PASS | whenInvalidated() resolves on invalidation | 984µs |
| PASS | update() returns fresh computed after invalidation | 1.6ms |
| PASS | captures cross-service dependency (watch total) | 1.2ms |
| PASS | throws if no @computed method called inside | 1.4ms |
| PASS | resolves immediately if already invalidated | 245µs |
| PASS | resolves when invalidated later | 115µs |

## fusion/__tests__/compute-context.test.ts

**passed** — 114.2ms

| Status | Test | Duration |
|---|---|---:|
| PASS | current is undefined outside any context | 1.0ms |
| PASS | run sets the current context | 707µs |
| PASS | context is restored after run | 145µs |
| PASS | propagates through async calls | 18.8ms |
| PASS | nested contexts work correctly | 572µs |
| PASS | isActive is false outside scope | 218µs |
| PASS | isActive is true inside begin() scope | 421µs |
| PASS | isActive restored after scope ends | 303µs |
| PASS | AsyncLocalStorage isolation: two concurrent computations have independent contexts | 29.0ms |
| PASS | context not leaked on error: if computation throws, context is restored | 598µs |
| PASS | deep async chain: context propagates through 5+ levels | 61.2ms |

## fusion/__tests__/computed-decorator.test.ts

**passed** — 149.2ms

| Status | Test | Duration |
|---|---|---:|
| PASS | caches results on second call | 2.9ms |
| PASS | different args are cached separately | 471µs |
| PASS | recomputes after invalidation | 656µs |
| PASS | tracks dependencies: child invalidation → parent recomputes | 1.3ms |
| PASS | handles multiple dependencies | 693µs |
| PASS | handles errors in computed methods | 1.6ms |
| PASS | invalidation in scope does not execute method | 380µs |
| PASS | same call from two concurrent callers returns same value (deduplication) | 57.3ms |
| PASS | error in @computed method: captured, subsequent call retries | 720µs |
| PASS | invalidation + immediate re-call: verify fresh value | 276µs |
| PASS | cancellation via AbortSignal does not break cache | 203µs |
| PASS | auto-recompute via ComputedState wrapping @computed method | 81.1ms |
| PASS | registers computed in global registry | 229µs |
| PASS | unregisters on invalidation | 233µs |

## fusion/__tests__/computed-registry.test.ts

**passed** — 5.5ms

| Status | Test | Duration |
|---|---|---:|
| PASS | register and get | 1.5ms |
| PASS | get returns undefined for missing key | 274µs |
| PASS | get returns undefined for invalidated entry | 275µs |
| PASS | register invalidates previous version | 398µs |
| PASS | unregister removes entry | 225µs |
| PASS | unregister does not remove newer version | 192µs |
| PASS | tracks size | 266µs |
| PASS | rapid register+get cycles do not lose entries | 1.6ms |
| PASS | clear removes all entries | 484µs |

## fusion/__tests__/computed-state.test.ts

**passed** — 393.8ms

| Status | Test | Duration |
|---|---|---:|
| PASS | computes initial value | 21.6ms |
| PASS | auto-updates after invalidation | 29.2ms |
| PASS | fires onUpdated after recomputation | 15.1ms |
| PASS | fires onInvalidated when computed invalidates | 15.3ms |
| PASS | fires onUpdating before recomputation | 15.2ms |
| PASS | handles errors and tracks retryCount | 52.0ms |
| PASS | preserves lastNonErrorComputed on error | 44.4ms |
| PASS | respects updateDelayer | 107.4ms |
| PASS | disposal stops the update loop | 47.1ms |
| PASS | tracks dependencies on @computed methods | 45.8ms |

## fusion/__tests__/computed.test.ts

**passed** — 269.2ms

| Status | Test | Duration |
|---|---|---:|
| PASS | starts in Computing state | 1.4ms |
| PASS | transitions to Consistent on trySetOutput | 330µs |
| PASS | trySetOutput fails if not Computing | 194µs |
| PASS | transitions to Invalidated on invalidate | 440µs |
| PASS | invalidate is idempotent | 188µs |
| PASS | fires onInvalidated event | 246µs |
| PASS | defers invalidation during Computing | 166µs |
| PASS | stores error results | 838µs |
| PASS | throws when accessing value during Computing | 407µs |
| PASS | tracks dependencies | 264µs |
| PASS | transitive invalidation: child → parent | 183µs |
| PASS | transitive invalidation: A → B → C | 166µs |
| PASS | fan-out invalidation: one dependency, multiple dependants | 329µs |
| PASS | invalidating an already-invalid dependency invalidates new dependant immediately | 199µs |
| PASS | does not add dependency if parent is not Computing | 147µs |
| PASS | cleans up dependency links on invalidation | 147µs |
| PASS | auto-invalidation timer fires after configured delay | 105.4ms |
| PASS | auto-invalidation timer cancelled on manual invalidation | 157.6ms |
| PASS | deep dependency chain (10 levels) cascades invalidation | 246µs |
| PASS | diamond dependency: A depends on B and C, both depend on D — A invalidated once | 122µs |

## fusion/__tests__/concurrency.test.ts

**passed** — 520.3ms

| Status | Test | Duration |
|---|---|---:|
| PASS | MutableState concurrent updates: converges to final value | 135.0ms |
| PASS | multiple ComputedStates watching same MutableState converge | 119.6ms |
| PASS | concurrent capture of same @computed method returns same value | 32.1ms |
| PASS | fan-out stress: 1 MutableState, 20 ComputedStates — all see final value | 233.3ms |

## fusion/__tests__/mutable-state.test.ts

**passed** — 52.2ms

| Status | Test | Duration |
|---|---|---:|
| PASS | holds initial value | 2.0ms |
| PASS | set(value) triggers immediate recompute | 829µs |
| PASS | set(Result) works | 347µs |
| PASS | set(updater) pattern | 359µs |
| PASS | fires onInvalidated on set | 332µs |
| PASS | fires onUpdating and onUpdated on set | 685µs |
| PASS | tracks error state | 777µs |
| PASS | preserves lastNonErrorComputed on error | 298µs |
| PASS | resets retryCount on success after error | 498µs |
| PASS | dependants recompute when mutable state changes | 44.6ms |
| PASS | multiple rapid sets only keep last value | 201µs |
| PASS | dispose invalidates current computed | 134µs |
| PASS | set after dispose still works (no crash) | 566µs |
| PASS | set same value still triggers invalidation (no skip-if-equal) | 163µs |

## fusion/__tests__/update-delayer.test.ts

**passed** — 64.3ms

| Status | Test | Duration |
|---|---|---:|
| PASS | resolves immediately | 917µs |
| PASS | resolves immediately regardless of retryCount | 93µs |
| PASS | resolves after yielding to event loop | 151µs |
| PASS | respects AbortSignal cancellation | 1.6ms |
| PASS | delays for the specified duration | 60.4ms |
| PASS | respects AbortSignal cancellation | 654µs |
| PASS | rejects immediately if signal already aborted | 293µs |

## react/__tests__/use-computed-state.test.tsx

**passed** — 647.1ms

| Status | Test | Duration |
|---|---|---:|
| PASS | starts with isUpdating=true, then resolves | 78.3ms |
| PASS | exposes error on computation failure | 61.4ms |
| PASS | re-renders on invalidation with updated value | 118.1ms |
| PASS | transitions through isUpdating on re-computation | 96.3ms |
| PASS | cleans up on unmount | 172.5ms |
| PASS | handles error then recovery | 120.1ms |

## react/__tests__/use-computed.test.tsx

**passed** — 712.3ms

| Status | Test | Duration |
|---|---|---:|
| PASS | renders initial undefined then resolved value | 62.1ms |
| PASS | renders initialValue before computation completes | 164.8ms |
| PASS | re-renders on invalidation | 127.3ms |
| PASS | cleans up on unmount (no leak) | 173.3ms |
| PASS | does not render error values (keeps last good value) | 119.9ms |
| PASS | returns string values correctly | 64.3ms |

## react/__tests__/use-mutable-state.test.tsx

**passed** — 211.8ms

| Status | Test | Duration |
|---|---|---:|
| PASS | renders initial value | 12.4ms |
| PASS | updates on setter call | 6.8ms |
| PASS | supports multiple updates | 3.8ms |
| PASS | setter sets exact value | 1.9ms |
| PASS | cleans up on unmount | 66.5ms |
| PASS | works with string values | 2.0ms |
| PASS | integrates with computed dependency graph | 117.8ms |

## rpc/__tests__/edge-cases.test.ts

**passed** — 149.6ms

| Status | Test | Duration |
|---|---|---:|
| PASS | server deduplicates concurrent re-fetches for the same input | 75.5ms |
| PASS | mutation inside onInvalidated produces consistent snapshot on recompute | 729µs |
| PASS | chained invalidation with intermediate mutation is consistent | 568µs |
| PASS | handles registry clear without crash when server sends invalidation | 12.3ms |
| PASS | fresh RPC call works after registry clear | 30.0ms |
| PASS | multiple registry clears during active session are safe | 29.6ms |

## rpc/__tests__/invalidation-push.test.ts

**passed** — 37.6ms

| Status | Test | Duration |
|---|---|---:|
| PASS | compute call returns result via proxy | 2.9ms |
| PASS | server invalidation reaches client | 19.6ms |
| PASS | cached compute call is served from registry | 718µs |
| PASS | different args are cached separately | 864µs |
| PASS | invalidation only affects the invalidated key | 13.6ms |

## rpc/__tests__/peer.test.ts

**passed** — 5.2ms

| Status | Test | Duration |
|---|---|---:|
| PASS | makes a regular call and receives result | 1.6ms |
| PASS | propagates errors from server | 1.3ms |
| PASS | handles unknown method | 254µs |
| PASS | handles unknown service | 418µs |
| PASS | handles multiple concurrent calls | 379µs |
| PASS | rejects pending calls on disconnect | 213µs |
| PASS | fires onClose event when transport closes | 200µs |
| PASS | handles no dispatcher gracefully | 213µs |

## rpc/__tests__/protocol.test.ts

**passed** — 4.3ms

| Status | Test | Duration |
|---|---|---:|
| PASS | has correct numeric values | 1.3ms |
| PASS | round-trips a Call message | 784µs |
| PASS | round-trips a ComputeCall message | 276µs |
| PASS | round-trips an Ok message with data | 317µs |
| PASS | round-trips an Error message | 180µs |
| PASS | round-trips an Invalidate message | 137µs |
| PASS | round-trips a Cancel message | 221µs |
| PASS | handles undefined optional fields | 263µs |

## rpc/__tests__/reconnect.test.ts

**passed** — 594.6ms

| Status | Test | Duration |
|---|---|---:|
| PASS | forwards messages while connected | 1.7ms |
| PASS | sends messages through inner transport | 338µs |
| PASS | reconnects after disconnect | 50.3ms |
| PASS | retries with exponential backoff | 204.3ms |
| PASS | gives up after maxAttempts | 202.9ms |
| PASS | fires onReconnected callback | 49.8ms |
| PASS | does not reconnect after manual dispose | 52.7ms |
| PASS | throws when sending while reconnecting | 32.6ms |

## rpc/__tests__/remote-computed.test.ts

**passed** — 136.4ms

| Status | Test | Duration |
|---|---|---:|
| PASS | remote computed participates in capture() | 3.0ms |
| PASS | capture detects remote invalidation | 817µs |
| PASS | local @computed depends on remote @computed | 749µs |
| PASS | local @computed invalidates when remote dependency invalidates | 1.0ms |
| PASS | ComputedState auto-updates on remote invalidation | 128.9ms |
| PASS | error from remote @computed propagates correctly | 1.4ms |

## rpc/__tests__/service-registry.test.ts

**passed** — 4.1ms

| Status | Test | Duration |
|---|---|---:|
| PASS | registers and resolves a service | 1.3ms |
| PASS | resolves methods | 441µs |
| PASS | detects @computed methods | 285µs |
| PASS | detects non-@computed methods | 433µs |
| PASS | returns undefined for unknown service | 273µs |
| PASS | returns undefined for unknown method | 99µs |
| PASS | lists all methods for a service | 257µs |
| PASS | clears all services | 131µs |

## rpc/__tests__/transport.test.ts

**passed** — 5.4ms

| Status | Test | Duration |
|---|---|---:|
| PASS | delivers messages from A to B | 2.4ms |
| PASS | delivers messages from B to A | 386µs |
| PASS | delivers multiple messages in order | 351µs |
| PASS | fires onClose when disposed | 597µs |
| PASS | closing one side closes the other | 198µs |
| PASS | throws when sending on closed transport | 803µs |
| PASS | double dispose is safe | 355µs |

## rpc/__tests__/ws-rpc.test.ts

**passed** — 0µs

| Status | Test | Duration |
|---|---|---:|
| SKIP | connects and makes a regular call | 0µs |
| SKIP | makes a compute call over WebSocket | 0µs |
| SKIP | receives invalidation over WebSocket | 0µs |
| SKIP | handles multiple clients | 0µs |
| SKIP | handles error propagation over WebSocket | 0µs |

## rpc/__tests__/ws-transport.test.ts

**passed** — 3.7ms

| Status | Test | Duration |
|---|---|---:|
| PASS | sends messages via ws.send | 1.9ms |
| PASS | fires onMessage when handleMessage is called | 427µs |
| PASS | fires onClose when handleClose is called | 277µs |
| PASS | throws when sending on closed transport | 730µs |

---

*Generated 2026-03-01T18:56:35.421Z*