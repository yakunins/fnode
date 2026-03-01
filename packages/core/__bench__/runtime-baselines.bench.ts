import { describe, bench } from "vitest";

describe("runtime baselines", () => {
  bench("Date.now()", () => {
    Date.now();
  });

  bench("performance.now()", () => {
    performance.now();
  });

  bench("Promise.resolve()", async () => {
    await Promise.resolve();
  });

  const map = new Map<string, number>();
  map.set("key", 42);

  bench("Map.get() hit", () => {
    map.get("key");
  });

  bench("Map.set() overwrite", () => {
    map.set("key", 42);
  });

  bench("JSON.stringify() small object", () => {
    JSON.stringify({ id: 1, name: "test", active: true });
  });

  bench("JSON.parse() small object", () => {
    JSON.parse('{"id":1,"name":"test","active":true}');
  });
});
