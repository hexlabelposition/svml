import { expect, test } from "vitest";
import * as svml from "../src/index.js";

test("root entry exports exactly the public API", () => {
  expect(Object.keys(svml).sort()).toEqual([]);
});
