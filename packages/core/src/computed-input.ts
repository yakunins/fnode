/**
 * ComputedInput — cache key identity for a computed value.
 *
 * Mirrors ActualLab.Fusion ComputedInput:
 * - Identifies a specific computation: service instance + method + args
 * - Pre-computed string key for O(1) Map lookups
 * - Used as the key in ComputedRegistry
 */

export class ComputedInput {
  readonly service: object;
  readonly method: string;
  readonly args: readonly unknown[];
  readonly key: string;

  constructor(service: object, method: string, args: readonly unknown[]) {
    this.service = service;
    this.method = method;
    this.args = args;
    this.key = ComputedInput.computeKey(service, method, args);
  }

  equals(other: ComputedInput): boolean {
    return this.key === other.key;
  }

  private static computeKey(
    service: object,
    method: string,
    args: readonly unknown[]
  ): string {
    const serviceId = ComputedInput.getServiceId(service);
    const argsKey = ComputedInput.hashArgs(args);
    return `${serviceId}:${method}:${argsKey}`;
  }

  // --- Service identity ---

  static #serviceIdMap = new WeakMap<object, number>();
  static #nextServiceId = 1;

  private static getServiceId(service: object): number {
    let id = ComputedInput.#serviceIdMap.get(service);
    if (id === undefined) {
      id = ComputedInput.#nextServiceId++;
      ComputedInput.#serviceIdMap.set(service, id);
    }
    return id;
  }

  // --- Argument hashing ---

  private static hashArgs(args: readonly unknown[]): string {
    if (args.length === 0) return "";
    if (args.length === 1) return ComputedInput.hashArg(args[0]);
    return args.map(ComputedInput.hashArg).join(",");
  }

  private static hashArg(arg: unknown): string {
    if (arg === null) return "null";
    if (arg === undefined) return "undefined";

    switch (typeof arg) {
      case "string":
        return JSON.stringify(arg);
      case "number":
      case "boolean":
      case "bigint":
        return String(arg);
      case "object":
        // Stable key: sorted keys → JSON
        return JSON.stringify(arg, Object.keys(arg as object).sort());
      default:
        return String(arg);
    }
  }
}
