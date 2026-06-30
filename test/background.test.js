const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const scriptPath = path.join(__dirname, "../src/background/background.js");
const scriptSource = fs.readFileSync(scriptPath, "utf8");

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadBackground(options = {}) {
  const saveSettingsCalls = [];
  const getSettingsCalls = [];
  const downloadCalls = [];
  const messageListeners = [];
  const installListeners = [];

  const context = {
    console,
    globalThis: null,
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
        download(downloadOptions) {
          downloadCalls.push(downloadOptions);
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
      media: {
        normalizeMediaUrl(url) {
          if (url === "https://example.com/not-allowed.jpg") {
            return null;
          }
          return url;
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

  if (options.downloadImpl) {
    context.browser.downloads.download = (downloadOptions) => {
      downloadCalls.push(downloadOptions);
      return options.downloadImpl(downloadOptions);
    };
  }

  context.globalThis = context;

  vm.runInNewContext(scriptSource, context, { filename: scriptPath });

  return {
    installListeners,
    messageListeners,
    saveSettingsCalls,
    getSettingsCalls,
    downloadCalls
  };
}

test("onInstalled seeds defaults only for fresh installs", async () => {
  const { installListeners, saveSettingsCalls } = loadBackground();

  await installListeners[0]({ reason: "update" });
  await installListeners[0]({ reason: "install" });

  assert.equal(saveSettingsCalls.length, 1);
  assert.deepEqual(saveSettingsCalls[0], { askWhereToSave: false });
});

test("settings messages round-trip through background storage", async () => {
  const { messageListeners, getSettingsCalls, saveSettingsCalls } = loadBackground();

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

test("download rejects non-Instagram URLs before calling downloads API", async () => {
  const { messageListeners, downloadCalls } = loadBackground();

  const response = await messageListeners[0]({
    type: "INSTASAVELITE_DOWNLOAD_MEDIA",
    payload: {
      items: [
        {
          url: "https://example.com/not-allowed.jpg",
          filename: "instagram-2026-06-30-image-01.jpg"
        }
      ]
    }
  });

  assert.equal(response.type, "INSTASAVELITE_DOWNLOAD_FAILED");
  assert.match(response.payload.message, /invalid download url/i);
  assert.equal(downloadCalls.length, 0);
});

test("download uses normalized URL and saveAs setting", async () => {
  const { messageListeners, downloadCalls } = loadBackground({
    downloadImpl() {
      return Promise.resolve(42);
    }
  });

  const response = await messageListeners[0]({
    type: "INSTASAVELITE_DOWNLOAD_MEDIA",
    payload: {
      items: [
        {
          url: "https://www.instagram.com/p/example/media/?x=1",
          filename: "instagram-2026-06-30-image-01.jpg"
        }
      ]
    }
  });

  assert.equal(response.type, "INSTASAVELITE_DOWNLOAD_COMPLETE");
  assert.deepEqual(toPlain(response.payload.downloadIds), [42]);
  assert.deepEqual(toPlain(downloadCalls), [
    {
      url: "https://www.instagram.com/p/example/media/?x=1",
      filename: "instagram-2026-06-30-image-01.jpg",
      saveAs: true,
      conflictAction: "uniquify"
    }
  ]);
});
