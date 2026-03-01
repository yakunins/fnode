/**
 * RpcServiceRegistry — registers services and resolves method calls.
 *
 * Scans service instances for @computed methods using the COMPUTED_METHOD symbol.
 */

import { COMPUTED_METHOD } from "@fnodejs/fusion";

export interface RpcMethodDef {
  readonly service: string;
  readonly method: string;
  readonly fn: Function;
  readonly target: object;
  readonly isComputed: boolean;
}

export interface RpcServiceDef {
  readonly name: string;
  readonly target: object;
  readonly methods: Map<string, RpcMethodDef>;
}

export class RpcServiceRegistry {
  readonly #services = new Map<string, RpcServiceDef>();

  get size(): number {
    return this.#services.size;
  }

  register(name: string, target: object): void {
    const methods = new Map<string, RpcMethodDef>();

    // Walk prototype chain to find all methods
    let proto = Object.getPrototypeOf(target);
    while (proto && proto !== Object.prototype) {
      for (const key of Object.getOwnPropertyNames(proto)) {
        if (key === "constructor" || methods.has(key)) continue;
        const descriptor = Object.getOwnPropertyDescriptor(proto, key);
        if (!descriptor || typeof descriptor.value !== "function") continue;

        const fn = descriptor.value;
        const isComputed = fn[COMPUTED_METHOD] === true;
        methods.set(key, { service: name, method: key, fn, target, isComputed });
      }
      proto = Object.getPrototypeOf(proto);
    }

    this.#services.set(name, { name, target, methods });
  }

  getService(name: string): RpcServiceDef | undefined {
    return this.#services.get(name);
  }

  getMethod(service: string, method: string): RpcMethodDef | undefined {
    return this.#services.get(service)?.methods.get(method);
  }

  has(name: string): boolean {
    return this.#services.has(name);
  }

  clear(): void {
    this.#services.clear();
  }
}
