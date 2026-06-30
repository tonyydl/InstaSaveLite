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

Open an Instagram page. Use the in-page download button for the current media, or open the toolbar popup to download one detected item or all detected items.

## Tests

```bash
node test/run-all.js
```
