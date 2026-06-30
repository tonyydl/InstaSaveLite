const test = require("node:test");
const assert = require("node:assert/strict");

require("../src/shared/constants.js");
require("../src/shared/storage.js");

const storage = globalThis.InstaSaveLite.storage;

test("mergeSettings returns defaults for missing input", () => {
  assert.deepEqual(storage.mergeSettings(), { askWhereToSave: false });
});

test("mergeSettings preserves boolean askWhereToSave", () => {
  assert.deepEqual(storage.mergeSettings({ askWhereToSave: true }), { askWhereToSave: true });
  assert.deepEqual(storage.mergeSettings({ askWhereToSave: false }), { askWhereToSave: false });
});

test("mergeSettings ignores non-boolean askWhereToSave", () => {
  assert.deepEqual(storage.mergeSettings({ askWhereToSave: "yes" }), { askWhereToSave: false });
});
