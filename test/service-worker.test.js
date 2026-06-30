const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const scriptPath = path.join(__dirname, "../src/background/service-worker.js");
const scriptSource = fs.readFileSync(scriptPath, "utf8").trim();

test("service worker only imports the shared background scripts in order", () => {
  assert.equal(
    scriptSource,
    [
      'importScripts("../vendor/browser-polyfill.min.js");',
      'importScripts("../shared/constants.js");',
      'importScripts("../shared/media.js");',
      'importScripts("../shared/storage.js");',
      'importScripts("./background.js");'
    ].join("\n")
  );
});
