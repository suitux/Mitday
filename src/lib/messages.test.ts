import { describe, expect, it } from "vitest";
import ca from "../../messages/ca.json";
import en from "../../messages/en.json";
import es from "../../messages/es.json";

function keys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) =>
    keys(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("messages", () => {
  const base = keys(es).sort();
  it.each([
    ["ca", ca],
    ["en", en],
  ])("%s has exactly the same keys as es", (_name, messages) => {
    expect(keys(messages).sort()).toEqual(base);
  });
});
