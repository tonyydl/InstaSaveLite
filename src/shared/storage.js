(function initStorage(globalScope) {
  const root = globalScope.InstaSaveLite || (globalScope.InstaSaveLite = {});
  const defaults = root.constants.DEFAULT_SETTINGS;

  function getBrowserApi() {
    return globalScope.browser || globalScope.chrome;
  }

  function mergeSettings(input) {
    const settings = { ...defaults };

    if (input && typeof input.askWhereToSave === "boolean") {
      settings.askWhereToSave = input.askWhereToSave;
    }

    return settings;
  }

  async function getSettings() {
    const api = getBrowserApi();

    if (!api || !api.storage || !api.storage.sync) {
      return mergeSettings();
    }

    const values = await api.storage.sync.get(defaults);
    return mergeSettings(values);
  }

  async function saveSettings(settings) {
    const merged = mergeSettings(settings);
    const api = getBrowserApi();

    if (api && api.storage && api.storage.sync) {
      await api.storage.sync.set(merged);
    }

    return merged;
  }

  root.storage = {
    mergeSettings,
    getSettings,
    saveSettings
  };
})(globalThis);
