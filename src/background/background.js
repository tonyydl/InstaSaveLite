(function initBackground(globalScope) {
  const root = globalScope.InstaSaveLite;
  const browserApi = globalScope.browser || globalScope.chrome;
  const messageTypes = root.constants.MESSAGE_TYPES;

  function isFreshInstall(details) {
    const installReason = browserApi.runtime && browserApi.runtime.OnInstalledReason && browserApi.runtime.OnInstalledReason.INSTALL;

    return Boolean(details) && (details.reason === "install" || (installReason !== undefined && details.reason === installReason));
  }

  async function downloadItem(item, saveAs) {
    if (!item || !item.url || !item.filename) {
      throw new Error("Missing download item URL or filename");
    }

    const normalizedUrl = root.media.normalizeMediaUrl(item.url);
    if (!normalizedUrl) {
      throw new Error("Invalid download URL");
    }

    return browserApi.downloads.download({
      url: normalizedUrl,
      filename: item.filename,
      saveAs,
      conflictAction: "uniquify"
    });
  }

  browserApi.runtime.onInstalled.addListener((details) => {
    if (!isFreshInstall(details)) {
      return;
    }

    root.storage.saveSettings(root.constants.DEFAULT_SETTINGS);
  });

  browserApi.runtime.onMessage.addListener((message) => {
    if (!message) {
      return undefined;
    }

    if (message.type === messageTypes.GET_SETTINGS) {
      return (async () => ({
        type: messageTypes.GET_SETTINGS,
        payload: {
          settings: await root.storage.getSettings()
        }
      }))();
    }

    if (message.type === messageTypes.SAVE_SETTINGS) {
      return (async () => {
        const settings = await root.storage.saveSettings(message.payload && message.payload.settings);
        return {
          type: messageTypes.SAVE_SETTINGS,
          payload: { settings }
        };
      })();
    }

    if (message.type !== messageTypes.DOWNLOAD_MEDIA) {
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
})(globalThis);
