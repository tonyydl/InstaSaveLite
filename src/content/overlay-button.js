(function initOverlay(globalScope) {
  const root = globalScope.InstaSaveLite || (globalScope.InstaSaveLite = {});

  function createDownloadButton(options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "instasavelite-download-button";
    button.setAttribute("aria-label", "Download Instagram media");
    button.title = "Download Instagram media";
    button.appendChild(document.createElement("span"));
    button.addEventListener("click", () => options.onClick());
    document.documentElement.appendChild(button);
    return button;
  }

  function positionDownloadButton(button, candidate) {
    if (!button || !candidate || !candidate.bounds) {
      return;
    }

    const margin = 12;
    const buttonSize = 38;
    const left = Math.max(8, candidate.bounds.right - buttonSize - margin);
    const top = Math.max(8, candidate.bounds.bottom - buttonSize - margin);
    button.style.left = `${Math.round(left)}px`;
    button.style.top = `${Math.round(top)}px`;
  }

  root.overlay = {
    createDownloadButton,
    positionDownloadButton
  };
})(globalThis);
