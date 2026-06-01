import { describe, expect, it, vi } from "vitest";
import { deleteCachedByPrefix, getCached, getOrSetCached } from "../../src/services/cache.service";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

describe("cache service", () => {
  it("deduplicates concurrent loaders for the same cache key", async () => {
    const loader = vi.fn().mockResolvedValue("value");

    const [first, second] = await Promise.all([
      getOrSetCached("test-cache:dedupe", 1_000, loader),
      getOrSetCached("test-cache:dedupe", 1_000, loader),
    ]);

    expect([first, second]).toEqual(["value", "value"]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("does not restore stale data after invalidation while a loader is running", async () => {
    const staleRequest = deferred<string>();
    const freshRequest = deferred<string>();

    const staleResult = getOrSetCached("test-cache:race", 1_000, () => staleRequest.promise);
    deleteCachedByPrefix("test-cache:");
    const freshResult = getOrSetCached("test-cache:race", 1_000, () => freshRequest.promise);

    staleRequest.resolve("stale");
    freshRequest.resolve("fresh");

    await expect(staleResult).resolves.toBe("stale");
    await expect(freshResult).resolves.toBe("fresh");
    expect(getCached("test-cache:race")).toBe("fresh");
  });
});
