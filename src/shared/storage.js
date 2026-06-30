(function initStorage(globalScope) {
  const root = globalScope.InstaSaveLite || (globalScope.InstaSaveLite = {});
  const defaults = root.constants.DEFAULT_SETTINGS;

  function getBrowserApi() {
    return globalScope.browser || globalScope.chrome;
  }

  function getStorageArea() {
    const api = getBrowserApi();

    if (!api || !api.storage) {
      return null;
    }

    return api.storage.sync || api.storage.local || null;
  }

  function mergeSettings(input) {
    const settings = { ...defaults };

    if (input && typeof input.askWhereToSave === "boolean") {
      settings.askWhereToSave = input.askWhereToSave;
    }

    return settings;
  }

  async function getSettings() {
    const storageArea = getStorageArea();

    if (!storageArea) {
      return mergeSettings();
    }

    const values = await storageArea.get(defaults);
    return mergeSettings(values);
  }

  async function saveSettings(settings) {
    const merged = mergeSettings(settings);
    const storageArea = getStorageArea();

    if (storageArea) {
      await storageArea.set(merged);
    }

    return merged;
  }

  root.storage = {
    mergeSettings,
    getSettings,
    saveSettings
  };
})(globalThis);
