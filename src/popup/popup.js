(function initPopup(globalScope) {
  const root = globalScope.InstaSaveLite;
  const browserApi = globalScope.browser || globalScope.chrome;
  const messageTypes = root.constants.MESSAGE_TYPES;
  const list = document.getElementById("mediaList");
  const statusText = document.getElementById("statusText");
  const downloadAllButton = document.getElementById("downloadAllButton");
  const askWhereToSaveInput = document.getElementById("askWhereToSaveInput");
  let mediaItems = [];

  async function getActiveTab() {
    const tabs = await browserApi.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  async function sendToActiveTab(message) {
    const tab = await getActiveTab();
    if (!tab || !tab.id) {
      throw new Error("No active tab found");
    }
    return browserApi.tabs.sendMessage(tab.id, message);
  }

  async function requestMedia() {
    const response = await sendToActiveTab({ type: messageTypes.GET_MEDIA });
    return Array.isArray(response && response.items) ? response.items : [];
  }

  async function getSettings() {
    const response = await browserApi.runtime.sendMessage({
      type: messageTypes.GET_SETTINGS
    });

    if (!response || response.type !== messageTypes.GET_SETTINGS) {
      throw new Error("Failed to load settings");
    }

    return response.payload && response.payload.settings ? response.payload.settings : {};
  }

  async function saveSettings(settings) {
    const response = await browserApi.runtime.sendMessage({
      type: messageTypes.SAVE_SETTINGS,
      payload: { settings }
    });

    if (!response || response.type !== messageTypes.SAVE_SETTINGS) {
      throw new Error("Failed to save settings");
    }

    return response.payload && response.payload.settings ? response.payload.settings : {};
  }

  async function downloadItems(items) {
    const response = await browserApi.runtime.sendMessage({
      type: messageTypes.DOWNLOAD_MEDIA,
      payload: { items }
    });

    if (response && response.type === messageTypes.DOWNLOAD_FAILED) {
      throw new Error(response.payload.message);
    }
  }

  function renderItems() {
    list.textContent = "";
    downloadAllButton.disabled = mediaItems.length === 0;

    if (!mediaItems.length) {
      statusText.textContent = "No visible Instagram media detected on this tab.";
      return;
    }

    statusText.textContent = `${mediaItems.length} item${mediaItems.length === 1 ? "" : "s"} detected.`;

    mediaItems.forEach((item) => {
      const row = document.createElement("li");
      row.className = "media-item";

      const preview = document.createElement("div");
      preview.className = "media-preview";
      if (item.type === "image") {
        const image = document.createElement("img");
        image.alt = "";
        image.src = item.url;
        preview.appendChild(image);
      } else {
        preview.textContent = "Video";
      }

      const meta = document.createElement("div");
      meta.className = "media-meta";
      const title = document.createElement("div");
      title.className = "media-title";
      title.textContent = item.type === "video" ? "Video" : "Image";
      const detail = document.createElement("div");
      detail.className = "media-detail";
      detail.textContent = item.width && item.height ? `${item.width} x ${item.height}` : item.filename;
      meta.append(title, detail);

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Save";
      button.addEventListener("click", async () => {
        button.disabled = true;
        statusText.textContent = "Starting download...";
        try {
          await downloadItems([item]);
          statusText.textContent = "Download started.";
        } catch (error) {
          statusText.textContent = error.message;
        } finally {
          button.disabled = false;
        }
      });

      row.append(preview, meta, button);
      list.appendChild(row);
    });
  }

  async function loadSettings() {
    const settings = await getSettings();
    askWhereToSaveInput.checked = settings.askWhereToSave;
  }

  askWhereToSaveInput.addEventListener("change", async () => {
    const settings = await saveSettings({ askWhereToSave: askWhereToSaveInput.checked });
    askWhereToSaveInput.checked = settings.askWhereToSave;
  });

  downloadAllButton.addEventListener("click", async () => {
    downloadAllButton.disabled = true;
    statusText.textContent = "Starting downloads...";
    try {
      await downloadItems(mediaItems);
      statusText.textContent = "Downloads started.";
    } catch (error) {
      statusText.textContent = error.message;
    } finally {
      downloadAllButton.disabled = mediaItems.length === 0;
    }
  });

  (async () => {
    try {
      await loadSettings();
      mediaItems = await requestMedia();
      renderItems();
    } catch (error) {
      statusText.textContent = error.message;
      downloadAllButton.disabled = true;
    }
  })();
})(globalThis);
