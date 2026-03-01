import { describe, bench } from "vitest";
import { ComputedInput } from "../src/index.js";

const service = { name: "TestService" };

describe("ComputedInput construction", () => {
  bench("zero args", () => {
    new ComputedInput(service, "method", []);
  });

  bench("1 numeric arg", () => {
    new ComputedInput(service, "method", [42]);
  });

  bench("1 string arg", () => {
    new ComputedInput(service, "method", ["hello"]);
  });

  bench("1 object arg (sorted-keys JSON)", () => {
    new ComputedInput(service, "method", [{ z: 1, a: 2, m: 3 }]);
  });

  bench("2 mixed args (number + string)", () => {
    new ComputedInput(service, "method", [42, "hello"]);
  });
});

describe("ComputedInput vs raw Map baseline", () => {
  const preComputedKey = "1:method:42";
  const map = new Map<string, number>();
  map.set(preComputedKey, 1);

  bench("baseline: raw Map.get() with pre-computed key", () => {
    map.get(preComputedKey);
  });

  bench("ComputedInput + Map.get()", () => {
    const input = new ComputedInput(service, "method", [42]);
    map.get(input.key);
  });
});
