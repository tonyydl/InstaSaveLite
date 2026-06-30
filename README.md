# InstaSaveLite

> Download Instagram images and videos that are already visible in your browser.

**English** | [中文](README.zh-TW.md)

InstaSaveLite is a lightweight cross-browser extension for Chrome, Edge, and
Firefox. It adds a small download icon to the currently opened Instagram post
or Reel, and provides a toolbar popup for reviewing detected media before
downloading.

The extension is designed for personal convenience. It does not bypass login,
private accounts, paid content, deleted content, DRM, region restrictions, or
any other access control.

---

## Features

- **Post download icon** - a compact download icon appears at the bottom-right
  of the currently opened post media.
- **Carousel support** - when a post contains multiple photos or videos, the
  icon downloads the currently visible slide instead of always choosing the
  first item.
- **Popup media list** - the toolbar popup lists media detected on the current
  Instagram page.
- **Single item or batch downloads** - save one detected item or use
  **Download all** from the popup.
- **Duplicate URL filtering** - repeated media URLs are collapsed before batch
  download.
- **Save location option** - toggle **Ask where to save** to decide whether the
  browser prompts before each download.
- **Cross-browser MV3 runtime** - supports Chrome/Edge Manifest V3 service
  workers and Firefox MV3 background scripts.

## What It Does Not Do

- No login automation.
- No private account bypass.
- No paid content, DRM, deleted content, or region restriction bypass.
- No background account crawling or bulk scraping.
- No backend server, telemetry, analytics, or remote logging.

InstaSaveLite only works with media URLs that Instagram has already exposed to
the page you can view in your browser.

## Installation

The extension is not packaged for a store yet. Load it as an unpacked or
temporary extension during development.

### Chrome / Edge

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `InstaSaveLite` folder.
5. Open Instagram and reload any already-open Instagram tabs.

### Firefox

Firefox 121 or newer is required.

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select `InstaSaveLite/manifest.json`.
4. Open Instagram and reload any already-open Instagram tabs.

## Usage

- Open an Instagram post, Reel, or a post from a profile grid.
- When a post is open, click the circular download icon at the bottom-right of
  the visible media.
- For carousel posts, move to the photo or video you want, then click the icon.
- Open the extension popup to see detected media and save individual items.
- Use **Download all** in the popup to queue all detected visible media items.
- Toggle **Ask where to save** if you want the browser to prompt for a
  destination before downloading.

On profile gallery/grid pages, the in-page icon is hidden until a specific post
is opened. The popup can still be used to inspect detected media.

## Privacy

- **No InstaSaveLite servers.** Downloads are initiated by your browser.
- **No analytics or telemetry.** The extension does not report usage.
- **Local settings only.** The `Ask where to save` preference is stored in
  browser extension storage.
- **Narrow URL handling.** Downloads are limited to HTTPS URLs on
  `instagram.com`, `cdninstagram.com`, and `fbcdn.net`.

## Project Structure

```text
InstaSaveLite/
+- manifest.json
+- README.md
+- README.zh-TW.md
+- icons/
+- styles/
|  +- content.css
+- src/
|  +- vendor/
|  |  +- browser-polyfill.min.js
|  +- shared/
|  |  +- constants.js
|  |  +- media.js
|  |  +- storage.js
|  +- content/
|  |  +- detector.js
|  |  +- overlay-button.js
|  |  +- index.js
|  +- background/
|  |  +- background.js
|  |  +- service-worker.js
|  +- popup/
|     +- popup.html
|     +- popup.css
|     +- popup.js
+- test/
   +- run-all.js
```

## Tests

Run the Node-based test suite:

```bash
node test/run-all.js
```

Useful syntax checks:

```bash
node --check src/content/detector.js
node --check src/background/background.js
node --check src/popup/popup.js
```

## Manual Verification

- Chrome/Edge: load the folder in `chrome://extensions` or
  `edge://extensions` with Developer mode enabled.
- Firefox: load `manifest.json` from
  `about:debugging#/runtime/this-firefox`.
- Open an Instagram image post and confirm the download icon appears on the
  visible media.
- Open a carousel post, switch slides, and confirm the icon downloads the
  current slide.
- Open an Instagram Reel or video post and confirm a download starts when the
  DOM exposes a direct media URL.
- Open the popup and confirm detected media appears in the list.
- Toggle **Ask where to save**, download one item, and confirm the browser
  prompts for a destination.
- Use **Download all** and confirm duplicate media URLs are not downloaded
  twice.
