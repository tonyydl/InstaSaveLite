(function initOverlay(globalScope) {
  const root = globalScope.InstaSaveLite || (globalScope.InstaSaveLite = {});

  function createDownloadButton(options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "instasavelite-download-button";
    button.textContent = "Download";
    button.title = "Download detected Instagram media";
    button.addEventListener("click", () => options.onClick());
    document.documentElement.appendChild(button);
    return button;
  }

  root.overlay = {
    createDownloadButton
  };
})(globalThis);
