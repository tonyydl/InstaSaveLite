(function initContent(globalScope) {
  const root = globalScope.InstaSaveLite;
  const browserApi = globalScope.browser || globalScope.chrome;
  const messageTypes = root.constants.MESSAGE_TYPES;
  let cachedCandidates = [];
  let button = null;
  let refreshTimer = null;

  function getCurrentCandidate(candidates) {
    return candidates
      .filter((candidate) => candidate.inViewport)
      .sort((a, b) => (b.viewportArea || 0) - (a.viewportArea || 0))[0] || candidates[0];
  }

  function refreshCandidates() {
    cachedCandidates = root.detector.collectMediaCandidates(document);
    if (button) {
      button.hidden = cachedCandidates.length === 0;
      root.overlay.positionDownloadButton(button, getCurrentCandidate(cachedCandidates));
    }
    return cachedCandidates;
  }

  async function downloadBestCandidate() {
    const candidates = refreshCandidates();
    if (!candidates.length) {
      return;
    }
    const bestCandidate = getCurrentCandidate(candidates);
    await browserApi.runtime.sendMessage({
      type: messageTypes.DOWNLOAD_MEDIA,
      payload: { items: [bestCandidate] }
    });
  }

  function ensureButton() {
    if (button && document.documentElement.contains(button)) {
      return;
    }
    button = root.overlay.createDownloadButton({ onClick: downloadBestCandidate });
    button.hidden = cachedCandidates.length === 0;
    root.overlay.positionDownloadButton(button, getCurrentCandidate(cachedCandidates));
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
