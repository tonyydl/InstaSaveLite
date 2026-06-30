const { spawnSync } = require("node:child_process");

const files = [
  "test/background.test.js",
  "test/content-index.test.js",
  "test/detector.test.js",
  "test/manifest.test.js",
  "test/media.test.js",
  "test/popup.test.js",
  "test/service-worker.test.js",
  "test/storage.test.js"
].filter((file) => require("node:fs").existsSync(file));

const result = spawnSync(process.execPath, ["--test", ...files], {
  stdio: "inherit",
  shell: false
});

process.exit(result.status ?? 1);
