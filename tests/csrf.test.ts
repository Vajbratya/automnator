import test from "node:test";
import assert from "node:assert/strict";

import { isCsrfValid, newCsrfToken } from "@/lib/csrf";

test("CSRF: new token validates with itself", () => {
  const token = newCsrfToken();
  assert.equal(typeof token, "string");
  assert.ok(token.length > 8);
  assert.equal(isCsrfValid(token, token), true);
});

test("CSRF: mismatched token fails", () => {
  assert.equal(isCsrfValid("a", "b"), false);
  assert.equal(isCsrfValid(undefined, "a"), false);
  assert.equal(isCsrfValid("a", null), false);
});

