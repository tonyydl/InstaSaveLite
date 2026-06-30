const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const scriptPath = path.join(__dirname, "../src/background/service-worker.js");
const scriptSource = fs.readFileSync(scriptPath, "utf8");

function loadServiceWorker() {
  const saveSettingsCalls = [];
  const getSettingsCalls = [];
  const messageListeners = [];
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
          addListener(listener) {
            messageListeners.push(listener);
          }
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
          DOWNLOAD_FAILED: "INSTASAVELITE_DOWNLOAD_FAILED",
          GET_SETTINGS: "INSTASAVELITE_GET_SETTINGS",
          SAVE_SETTINGS: "INSTASAVELITE_SAVE_SETTINGS"
        }
      },
      storage: {
        saveSettings(settings) {
          saveSettingsCalls.push(settings);
          return Promise.resolve({ askWhereToSave: Boolean(settings && settings.askWhereToSave) });
        },
        getSettings() {
          getSettingsCalls.push(true);
          return Promise.resolve({ askWhereToSave: true });
        }
      }
    },
    Promise
  };

  context.globalThis = context;

  vm.runInNewContext(scriptSource, context, { filename: scriptPath });

  return {
    installListeners,
    messageListeners,
    saveSettingsCalls,
    getSettingsCalls
  };
}

test("onInstalled seeds defaults only for fresh installs", async () => {
  const { installListeners, saveSettingsCalls } = loadServiceWorker();

  await installListeners[0]({ reason: "update" });
  await installListeners[0]({ reason: "install" });

  assert.equal(saveSettingsCalls.length, 1);
  assert.deepEqual(saveSettingsCalls[0], { askWhereToSave: false });
});

test("settings messages round-trip through background storage", async () => {
  const { messageListeners, getSettingsCalls, saveSettingsCalls } = loadServiceWorker();

  const getResponse = await messageListeners[0]({ type: "INSTASAVELITE_GET_SETTINGS" });
  const saveResponse = await messageListeners[0]({
    type: "INSTASAVELITE_SAVE_SETTINGS",
    payload: { settings: { askWhereToSave: false } }
  });

  assert.equal(getSettingsCalls.length, 1);
  assert.equal(getResponse.type, "INSTASAVELITE_GET_SETTINGS");
  assert.deepEqual(getResponse.payload.settings, { askWhereToSave: true });
  assert.deepEqual(saveSettingsCalls[0], { askWhereToSave: false });
  assert.equal(saveResponse.type, "INSTASAVELITE_SAVE_SETTINGS");
  assert.deepEqual(saveResponse.payload.settings, { askWhereToSave: false });
});
