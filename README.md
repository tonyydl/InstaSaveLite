# InstaSaveLite

InstaSaveLite is a cross-browser extension for downloading Instagram images and videos that are already visible in your browser.

## Scope

This extension does not bypass login, private accounts, deleted content, paid content, DRM, region restrictions, or access controls. It has no backend, analytics, telemetry, or remote logging.

## Install Unpacked

### Chrome / Edge

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select the `InstaSaveLite` folder.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose Load Temporary Add-on.
3. Select `InstaSaveLite/manifest.json`.

## Usage

Task 3 provides the extension scaffold and loadable runtime shells. Install the unpacked extension, open an Instagram page, and confirm the extension loads without errors. The in-page download button and toolbar popup download flows are planned for later tasks.

## Tests

```bash
node test/run-all.js
```
