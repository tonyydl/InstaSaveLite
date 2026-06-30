const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const scriptPath = path.join(__dirname, "../src/background/service-worker.js");
const scriptSource = fs.readFileSync(scriptPath, "utf8");

function loadServiceWorker() {
  const saveSettingsCalls = [];
  const installListeners = [];

  const context = {
    console,
    globalThis: null,
    importScripts() {},
    browser: {
      runtime: {
        OnInstalledReason: {
          INSTALL: "install"
        },
        onInstalled: {
          addListener(listener) {
            installListeners.push(listener);
          }
        },
        onMessage: {
          addListener() {}
        }
      },
      downloads: {
        download() {
          return Promise.resolve(1);
        }
      }
    },
    InstaSaveLite: {
      constants: {
        DEFAULT_SETTINGS: {
          askWhereToSave: false
        },
        MESSAGE_TYPES: {
          DOWNLOAD_MEDIA: "INSTASAVELITE_DOWNLOAD_MEDIA",
          DOWNLOAD_COMPLETE: "INSTASAVELITE_DOWNLOAD_COMPLETE",
          DOWNLOAD_FAILED: "INSTASAVELITE_DOWNLOAD_FAILED"
        }
      },
      storage: {
        saveSettings(settings) {
          saveSettingsCalls.push(settings);
        },
        getSettings() {
          return Promise.resolve({ askWhereToSave: false });
        }
      }
    },
    Promise
  };

  context.globalThis = context;

  vm.runInNewContext(scriptSource, context, { filename: scriptPath });

  return {
    installListeners,
    saveSettingsCalls
  };
}

test("onInstalled seeds defaults only for fresh installs", async () => {
  const { installListeners, saveSettingsCalls } = loadServiceWorker();

  await installListeners[0]({ reason: "update" });
  await installListeners[0]({ reason: "install" });

  assert.equal(saveSettingsCalls.length, 1);
  assert.deepEqual(saveSettingsCalls[0], { askWhereToSave: false });
});
