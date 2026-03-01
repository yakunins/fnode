# FNode

Distributed reactive memoization for Node.js/TypeScript/Bun.

Decorate a method with `@computed` and FNode automatically tracks its dependencies, caches the result, and invalidates it transitively when upstream data changes. Add `@commandHandler` for structured mutations with automatic invalidation. Add `@fnode/rpc` to distribute services over WebSocket — client code stays identical. Add `@fnode/react` to bind computed values to React components that auto-re-render.

```typescript
class CartService {
  @computed()
  async getTotal(cartId: string): Promise<number> {
    const cart = await this.cartRepo.get(cartId);
    let total = 0;
    for (const [productId, qty] of cart.items) {
      const product = await this.productService.get(productId); // dependency tracked
      total += product.price * qty;
    }
    return total;
  }
}

// Change a product price → getTotal auto-invalidates for affected carts
// No manual cache management. No subscriptions. No stale data.
```

## Packages

FNode is a Bun workspaces monorepo. Each package is independently usable — pick only what you need.

### @fnode/core

Minimal async utilities: `Result<T>`, `AsyncLock`, `AsyncLockSet<K>`, `TypedEvent<T>`, `ComputedInput`, `VersionGenerator`. No dependencies.

### @fnode/fusion

The engine. `@computed` decorator for memoization + dependency tracking, `Computed<T>` cache entries with three-state lifecycle (Computing → Consistent → Invalidated), `ComputeContext` for async propagation, `Invalidation.begin()` for scoped invalidation, `ComputedState` and `MutableState` for observable values, `capture()` for reactive observation loops.

```typescript
import { computed, Invalidation } from "@fnode/fusion";

class ProductService {
  @computed()
  async get(id: string): Promise<Product | undefined> {
    return this.db.select().from(products).where(eq(products.id, id)).get();
  }

  // Mutate, then invalidate:
  update(product: Product): void {
    this.db.update(products).set(product).where(eq(products.id, product.id)).run();
    using _ = Invalidation.begin();
    this.get(product.id); // cached result invalidated → dependants cascade
  }
}
```

### @fnode/commandr

Command bus with middleware pipeline. `@commandHandler` decorator for structured mutations, `Commander` for dispatch, `CommandContext` via `AsyncLocalStorage` for cross-cutting state, built-in `InvalidationMiddleware` that auto re-invokes handlers in invalidation scope.

```typescript
import { commandHandler, Commander } from "@fnode/commandr";

class EditProductCommand {
  constructor(public readonly product: Product) {}
}

class ProductService {
  @commandHandler(EditProductCommand)
  async edit(cmd: EditProductCommand): Promise<void> {
    if (Invalidation.isActive) {
      this.get(cmd.product.id); // declare what to invalidate
      return;
    }
    this.db.upsert(cmd.product); // actual mutation
  }
}

const commander = new Commander();
commander.addService(productService);
await commander.call(new EditProductCommand(product));
```

### @fnode/rpc

WebSocket RPC transport with invalidation push. Host `@computed` services on a server, access them transparently from a client proxy. Server-side invalidation automatically pushes to connected clients.

```typescript
// Server
import { RpcServiceRegistry, startRpcServer } from "@fnode/rpc/server";
const registry = new RpcServiceRegistry();
registry.register("product", productService);
const server = startRpcServer({ registry, port: 3000 });

// Client
import { RpcClient } from "@fnode/rpc";
const client = await RpcClient.connect({ url: "ws://localhost:3000" });
const remote = client.getProxy<IProductService>("product", ["get"]);
const product = await remote.get("apple"); // transparent RPC call
```

### @fnode/react

React hooks that auto-re-render when `@computed` values change.

```typescript
import { useComputed, useComputedState } from "@fnode/react";

function ProductPrice({ service, id }: Props) {
  const price = useComputed(() => service.get(id), [service, id]);
  return <span>{price ?? "loading..."}</span>;
}
```

- `useComputed(factory, deps)` — subscribe to a `@computed` value, re-render on invalidation
- `useComputedState(factory, deps)` — same, but also exposes `{ value, isUpdating }`

### @fnode/auth

Session management and user authentication as `@computed` services. `Session` (opaque token), `User` type, `AuthService` abstract class, `InMemoryAuthService` for testing, `createSessionMiddleware()` for command pipeline integration.

## Quick Start

```bash
# Clone and install
cd fnode
bun install

# Run all tests (261 passing)
bunx vitest run

# Run benchmarks
bunx vitest bench

# Typecheck
bunx tsc --build
```

## How It Works

**Dependency tracking**: When a `@computed` method calls another `@computed` method, the call is intercepted. The inner method's cached `Computed<T>` is registered as a dependency of the outer method's `Computed<T>`. This forms a directed acyclic graph.

**Caching**: Results are stored in `ComputedRegistry`, keyed by `(service instance, method name, arguments)`. Subsequent calls with the same key return the cached value without executing the method body.

**Invalidation**: When a `Computed<T>` is invalidated, it transitions from `Consistent` to `Invalidated`, fires its `onInvalidated` event, and recursively invalidates all dependants. The next call to the invalidated method recomputes from scratch and registers new dependency edges.

**Two-pass command pattern**: `InvalidationMiddleware` runs the handler twice — first normally (mutations happen), then in invalidation scope (handler declares which `@computed` methods to invalidate by calling them). The `if (Invalidation.isActive)` check separates the two concerns.

**RPC transparency**: Services are registered by name in `RpcServiceRegistry`. The server dispatches incoming WebSocket messages to the correct `@computed` method. When a cached result is invalidated, the server pushes a notification to connected clients, which mark their local caches as stale.

## Technology

- **Runtime**: Bun (primary), Node.js 22+ (compatible)
- **Language**: TypeScript 5.x with TC39 stage 3 decorators (not `experimentalDecorators`)
- **Testing**: Vitest
- **TC39 features**: `Symbol.dispose` / `using` for scoped resources, `AsyncLocalStorage` for context propagation, `Promise.withResolvers()` for async coordination
