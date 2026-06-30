const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const scriptPath = path.join(__dirname, "../src/popup/popup.js");
const scriptSource = fs.readFileSync(scriptPath, "utf8");

function createElement() {
  return {
    checked: false,
    className: "",
    disabled: false,
    hidden: false,
    listeners: {},
    textContent: "",
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    },
    append() {},
    appendChild() {}
  };
}

function loadPopupScript() {
  const sentMessages = [];
  const tabMessages = [];
  const elements = {
    mediaList: createElement(),
    statusText: createElement(),
    downloadAllButton: createElement(),
    askWhereToSaveInput: createElement()
  };

  const context = {
    console,
    globalThis: null,
    document: {
      createElement,
      getElementById(id) {
        return elements[id];
      }
    },
    browser: {
      runtime: {
        sendMessage(message) {
          sentMessages.push(message);
          if (message.type === "INSTASAVELITE_GET_SETTINGS") {
            return Promise.resolve({
              type: "INSTASAVELITE_GET_SETTINGS",
              payload: { settings: { askWhereToSave: true } }
            });
          }
          if (message.type === "INSTASAVELITE_SAVE_SETTINGS") {
            return Promise.resolve({
              type: "INSTASAVELITE_SAVE_SETTINGS",
              payload: { settings: message.payload.settings }
            });
          }
          if (message.type === "INSTASAVELITE_DOWNLOAD_MEDIA") {
            return Promise.resolve({ type: "INSTASAVELITE_DOWNLOAD_COMPLETE", payload: { downloadIds: [] } });
          }
          return Promise.resolve();
        }
      },
      tabs: {
        query() {
          return Promise.resolve([{ id: 42 }]);
        },
        sendMessage(tabId, message) {
          tabMessages.push({ tabId, message });
          return Promise.resolve({ items: [] });
        }
      }
    },
    InstaSaveLite: {
      constants: {
        MESSAGE_TYPES: {
          GET_MEDIA: "INSTASAVELITE_GET_MEDIA",
          DOWNLOAD_MEDIA: "INSTASAVELITE_DOWNLOAD_MEDIA",
          DOWNLOAD_COMPLETE: "INSTASAVELITE_DOWNLOAD_COMPLETE",
          DOWNLOAD_FAILED: "INSTASAVELITE_DOWNLOAD_FAILED",
          GET_SETTINGS: "INSTASAVELITE_GET_SETTINGS",
          SAVE_SETTINGS: "INSTASAVELITE_SAVE_SETTINGS"
        }
      },
      storage: {
        getSettings() {
          throw new Error("popup should not call storage.getSettings");
        },
        saveSettings() {
          throw new Error("popup should not call storage.saveSettings");
        }
      }
    },
    Promise
  };

  context.globalThis = context;

  vm.runInNewContext(scriptSource, context, { filename: scriptPath });

  return {
    elements,
    sentMessages,
    tabMessages
  };
}

test("popup loads and saves settings through runtime messages", async () => {
  const env = loadPopupScript();

  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(env.sentMessages[0].type, "INSTASAVELITE_GET_SETTINGS");
  assert.equal(env.elements.askWhereToSaveInput.checked, true);
  assert.equal(env.tabMessages[0].message.type, "INSTASAVELITE_GET_MEDIA");

  env.elements.askWhereToSaveInput.checked = false;
  await env.elements.askWhereToSaveInput.listeners.change();

  assert.equal(env.sentMessages[1].type, "INSTASAVELITE_SAVE_SETTINGS");
  assert.equal(env.sentMessages[1].payload.settings.askWhereToSave, false);
  assert.equal(env.elements.askWhereToSaveInput.checked, false);
});
