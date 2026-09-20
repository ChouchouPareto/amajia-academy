import test from "node:test";
import assert from "node:assert/strict";
import { learningHome } from "../lib/learning-mode.ts";

test("基础版和专业版有独立首页，不互相串页", () => {
  assert.equal(learningHome("basic"), "/basic");
  assert.equal(learningHome("coach"), "/coach");
});
