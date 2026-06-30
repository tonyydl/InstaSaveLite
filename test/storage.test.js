const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const constantsPath = path.join(__dirname, "../src/shared/constants.js");
const storagePath = path.join(__dirname, "../src/shared/storage.js");
const constantsSource = fs.readFileSync(constantsPath, "utf8");
const storageSource = fs.readFileSync(storagePath, "utf8");

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadStorage(browserApi) {
  const context = {
    console,
    globalThis: null,
    browser: browserApi,
    chrome: undefined,
    Promise
  };

  context.globalThis = context;

  vm.runInNewContext(constantsSource, context, { filename: constantsPath });
  vm.runInNewContext(storageSource, context, { filename: storagePath });

  return context.InstaSaveLite.storage;
}

test("mergeSettings returns defaults for missing input", () => {
  const storage = loadStorage();
  assert.deepEqual(toPlain(storage.mergeSettings()), { askWhereToSave: false });
});

test("mergeSettings preserves boolean askWhereToSave", () => {
  const storage = loadStorage();
  assert.deepEqual(toPlain(storage.mergeSettings({ askWhereToSave: true })), { askWhereToSave: true });
  assert.deepEqual(toPlain(storage.mergeSettings({ askWhereToSave: false })), { askWhereToSave: false });
});

test("mergeSettings ignores non-boolean askWhereToSave", () => {
  const storage = loadStorage();
  assert.deepEqual(toPlain(storage.mergeSettings({ askWhereToSave: "yes" })), { askWhereToSave: false });
});

test("getSettings prefers storage.sync when available", async () => {
  const calls = [];
  const storage = loadStorage({
    storage: {
      sync: {
        async get(defaults) {
          calls.push({ area: "sync", defaults });
          return { askWhereToSave: true };
        }
      },
      local: {
        async get() {
          calls.push({ area: "local" });
          return { askWhereToSave: false };
        }
      }
    }
  });

  const settings = await storage.getSettings();

  assert.deepEqual(toPlain(settings), { askWhereToSave: true });
  assert.deepEqual(toPlain(calls), [{ area: "sync", defaults: { askWhereToSave: false } }]);
});

test("getSettings falls back to storage.local when sync is unavailable", async () => {
  const calls = [];
  const storage = loadStorage({
    storage: {
      local: {
        async get(defaults) {
          calls.push({ area: "local", defaults });
          return { askWhereToSave: true };
        }
      }
    }
  });

  const settings = await storage.getSettings();

  assert.deepEqual(toPlain(settings), { askWhereToSave: true });
  assert.deepEqual(toPlain(calls), [{ area: "local", defaults: { askWhereToSave: false } }]);
});

test("saveSettings falls back to storage.local when sync is unavailable", async () => {
  const calls = [];
  const storage = loadStorage({
    storage: {
      local: {
        async set(settings) {
          calls.push(settings);
        }
      }
    }
  });

  const settings = await storage.saveSettings({ askWhereToSave: true });

  assert.deepEqual(toPlain(settings), { askWhereToSave: true });
  assert.deepEqual(toPlain(calls), [{ askWhereToSave: true }]);
});
