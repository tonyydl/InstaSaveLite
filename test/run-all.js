const { spawnSync } = require("node:child_process");

const files = [
  "test/media.test.js",
  "test/storage.test.js"
].filter((file) => require("node:fs").existsSync(file));

const result = spawnSync(process.execPath, ["--test", ...files], {
  stdio: "inherit",
  shell: false
});

process.exit(result.status ?? 1);
