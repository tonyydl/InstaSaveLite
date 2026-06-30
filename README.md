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

## Manual Verification

- Chrome: load the folder in `chrome://extensions` with Developer mode enabled.
- Firefox: load `manifest.json` from `about:debugging#/runtime/this-firefox`.
- Open an Instagram image post and confirm the popup lists at least one image.
- Open an Instagram Reel or video post and confirm the popup lists a video when Instagram exposes a direct media URL in the DOM.
- Click the in-page Download button and confirm a download starts.
- Toggle Ask where to save, then download one item and confirm the browser prompts for a destination.
- Use Download all on a carousel post and confirm duplicate URLs are not downloaded twice.
