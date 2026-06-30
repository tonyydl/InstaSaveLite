importScripts("../vendor/browser-polyfill.min.js");
importScripts("../shared/constants.js");
importScripts("../shared/storage.js");

const root = globalThis.InstaSaveLite;
const browserApi = globalThis.browser || globalThis.chrome;
const messageTypes = root.constants.MESSAGE_TYPES;

browserApi.runtime.onInstalled.addListener(() => {
  root.storage.saveSettings(root.constants.DEFAULT_SETTINGS);
});

async function downloadItem(item, saveAs) {
  if (!item || !item.url || !item.filename) {
    throw new Error("Missing download item URL or filename");
  }

  return browserApi.downloads.download({
    url: item.url,
    filename: item.filename,
    saveAs,
    conflictAction: "uniquify"
  });
}

browserApi.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== messageTypes.DOWNLOAD_MEDIA) {
    return undefined;
  }

  return (async () => {
    const settings = await root.storage.getSettings();
    const items = Array.isArray(message.payload && message.payload.items) ? message.payload.items : [];
    const downloadIds = [];

    for (const item of items) {
      downloadIds.push(await downloadItem(item, settings.askWhereToSave));
    }

    return {
      type: messageTypes.DOWNLOAD_COMPLETE,
      payload: { downloadIds }
    };
  })().catch((error) => ({
    type: messageTypes.DOWNLOAD_FAILED,
    payload: { message: error.message }
  }));
});
