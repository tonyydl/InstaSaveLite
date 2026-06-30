(function initOverlay(globalScope) {
  const root = globalScope.InstaSaveLite || (globalScope.InstaSaveLite = {});

  function createDownloadButton(options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "instasavelite-download-button";
    button.setAttribute("aria-label", "Download Instagram media");
    button.title = "Download Instagram media";
    button.innerHTML = [
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>',
      '<polyline points="7 10 12 15 17 10"></polyline>',
      '<line x1="12" x2="12" y1="15" y2="3"></line>',
      "</svg>"
    ].join("");
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
