const test = require("node:test");
const assert = require("node:assert/strict");

const manifest = require("../manifest.json");

test("manifest includes cross-browser MV3 background entries", () => {
  assert.equal(manifest.background.service_worker, "src/background/service-worker.js");
  assert.deepEqual(manifest.background.scripts, [
    "src/vendor/browser-polyfill.min.js",
    "src/shared/constants.js",
    "src/shared/media.js",
    "src/shared/storage.js",
    "src/background/background.js"
  ]);
});

test("manifest sets Firefox minimum version for MV3 background scripts", () => {
  assert.equal(manifest.browser_specific_settings.gecko.strict_min_version, "121.0");
});
