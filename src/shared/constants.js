(function initConstants(globalScope) {
  const root = globalScope.InstaSaveLite || (globalScope.InstaSaveLite = {});

  root.constants = {
    EXTENSION_NAME: "InstaSaveLite",
    DEFAULT_SETTINGS: {
      askWhereToSave: false
    },
    MESSAGE_TYPES: {
      GET_MEDIA: "INSTASAVELITE_GET_MEDIA",
      DOWNLOAD_MEDIA: "INSTASAVELITE_DOWNLOAD_MEDIA",
      DOWNLOAD_COMPLETE: "INSTASAVELITE_DOWNLOAD_COMPLETE",
      DOWNLOAD_FAILED: "INSTASAVELITE_DOWNLOAD_FAILED",
      GET_SETTINGS: "INSTASAVELITE_GET_SETTINGS",
      SAVE_SETTINGS: "INSTASAVELITE_SAVE_SETTINGS"
    },
    INSTAGRAM_HOST_PATTERN: /(^|\.)instagram\.com$/i,
    CDN_HOST_PATTERN: /(^|\.)cdninstagram\.com$|(^|\.)fbcdn\.net$/i
  };
})(globalThis);
