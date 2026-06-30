(function initContent(globalScope) {
  const root = globalScope.InstaSaveLite;
  const browserApi = globalScope.browser || globalScope.chrome;
  const messageTypes = root.constants.MESSAGE_TYPES;
  let cachedCandidates = [];
  let button = null;
  let refreshTimer = null;

  function refreshCandidates() {
    cachedCandidates = root.detector.collectMediaCandidates(document);
    if (button) {
      button.hidden = cachedCandidates.length === 0;
    }
    return cachedCandidates;
  }

  async function downloadBestCandidate() {
    const candidates = refreshCandidates();
    if (!candidates.length) {
      return;
    }
    await browserApi.runtime.sendMessage({
      type: messageTypes.DOWNLOAD_MEDIA,
      payload: { items: [candidates[0]] }
    });
  }

  function ensureButton() {
    if (button && document.documentElement.contains(button)) {
      return;
    }
    button = root.overlay.createDownloadButton({ onClick: downloadBestCandidate });
    button.hidden = cachedCandidates.length === 0;
  }

  function scheduleRefresh() {
    if (refreshTimer !== null) {
      globalScope.clearTimeout(refreshTimer);
    }
    refreshTimer = globalScope.setTimeout(() => {
      refreshTimer = null;
      refreshCandidates();
      ensureButton();
    }, 250);
  }

  browserApi.runtime.onMessage.addListener((message) => {
    if (!message) {
      return undefined;
    }
    if (message.type === messageTypes.GET_MEDIA) {
      return Promise.resolve({ items: refreshCandidates() });
    }
    return undefined;
  });

  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "srcset", "poster", "style", "class"]
  });

  scheduleRefresh();
})(globalThis);
