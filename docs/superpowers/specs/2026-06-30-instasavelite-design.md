# InstaSaveLite Design

## Summary

InstaSaveLite is a cross-browser WebExtension for downloading Instagram media that the user can already view in their browser. It supports Chrome, Edge, and Firefox with Manifest V3, vanilla JavaScript, and no build step.

The extension will not bypass authentication, private account restrictions, paywalls, DRM, or access controls. It only detects media present in pages the user can normally open.

## Goals

- Provide a quick in-page download button for visible Instagram images and videos.
- Provide a toolbar popup that lists media detected on the current Instagram page.
- Support single image posts, video posts, Reels, and carousel posts with multiple media items.
- Download through the browser `downloads` API.
- Default to automatic downloads, with a popup setting to ask where to save each file.
- Keep permissions narrow and compatible with Chrome and Firefox.

## Non-Goals

- No login automation.
- No private account, deleted content, paid content, DRM, or region lock bypass.
- No background scraping or bulk crawling across accounts.
- No server backend, analytics, telemetry, or remote logging.
- No store publishing automation in the first version.

## Architecture

The project will use a lightweight WebExtension layout:

```text
InstaSaveLite/
+- manifest.json
+- README.md
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
|  |  +- service-worker.js
|  +- popup/
|     +- popup.html
|     +- popup.css
|     +- popup.js
+- test/
   +- run-all.js
```

The implementation will follow the existing workspace preference shown by `StreamRain`: Manifest V3, `webextension-polyfill`, vanilla JS modules loaded as extension scripts, and Node-based tests for pure logic.

## Components

### Content Detector

The detector runs on `https://www.instagram.com/*`. It scans the current document for visible media candidates:

- `video[src]`
- `video > source[src]`
- `img[src]`
- `picture source[srcset]`

The detector normalizes candidates into a shared media object:

```js
{
  id: "stable-page-local-id",
  type: "image" | "video",
  url: "https://...",
  pageUrl: location.href,
  width: 1080,
  height: 1350,
  filename: "instagram-2026-06-30-image-01.jpg"
}
```

It filters out likely UI assets such as avatars, icons, sprites, tiny thumbnails, and duplicate URLs. It prefers visible, larger media near the active article, reel, modal, or carousel viewport.

### In-Page Download Button

The content script injects a compact floating download button near the active media area. The button downloads the best current media candidate. For carousel posts, it downloads the currently visible slide when detectable.

The button is intentionally small and uses extension-owned CSS classes to avoid interfering with Instagram layout. It can reattach after navigation because Instagram uses client-side routing.

### Popup

The popup asks the active tab content script for the current media list and renders:

- media type
- small preview when safe and available
- dimensions when detectable
- one download button per item
- download all detected items button
- setting: ask where to save before downloading

The popup does not describe hidden features or scrape unrelated pages. It shows an empty state when no downloadable media is detected.

### Background Service Worker

The background worker owns privileged browser APIs:

- handles download requests from content scripts and popup
- calls `browser.downloads.download`
- reads the `saveAs` preference
- sets default settings on install

Keeping downloads in the background avoids giving content scripts more privilege than needed.

### Storage

Settings are stored in `browser.storage.sync` when available:

```js
{
  askWhereToSave: false
}
```

If sync storage is unavailable, the extension can fall back to local behavior supported by the browser API.

## Data Flow

1. User opens an Instagram page.
2. Content script scans visible DOM media and caches normalized candidates.
3. In-page button sends the selected candidate to the background worker.
4. Popup requests the candidate list from the active tab when opened.
5. User chooses one item or all items.
6. Background worker downloads each item with a generated filename and the configured `saveAs` option.

## Permissions

Manifest permissions:

- `storage`
- `downloads`
- `activeTab`, for popup-to-active-tab messaging

Host permissions:

- `https://www.instagram.com/*`
- `https://*.cdninstagram.com/*`
- `https://*.fbcdn.net/*`

The first version should avoid broad network interception permissions such as `webRequest`.

## Error Handling

- If no media is detected, popup shows a short empty state.
- If a URL is missing or unsupported, the item is excluded.
- If download fails, the popup receives a failure message and shows a small per-item error state.
- If Instagram changes markup, the detector should fail quietly rather than breaking page interaction.
- Duplicate media URLs are collapsed before display and before bulk download.

## Cross-Browser Notes

The extension uses `webextension-polyfill` and the promise-based `browser.*` namespace. Chrome, Edge, and Firefox use the same source files.

Firefox requires `browser_specific_settings.gecko` in `manifest.json`. The initial target is Firefox 109+ because that aligns with practical Manifest V3 support.

## Testing

Automated tests will cover pure functions:

- media URL normalization
- srcset parsing
- duplicate filtering
- filename generation
- candidate scoring
- storage default merging

Manual verification will cover:

- Chrome unpacked extension load
- Firefox temporary add-on load
- image post download
- video/Reel download
- carousel item detection
- popup download list
- ask-where-to-save setting

## First Version Acceptance Criteria

- The project loads as an unpacked extension in Chrome.
- The project loads as a temporary add-on in Firefox.
- On an Instagram page with visible image media, popup lists at least one image candidate.
- On an Instagram page with visible video media, popup lists at least one video candidate when the DOM exposes a downloadable media URL.
- In-page button downloads the best visible media candidate.
- Popup can download one item or all detected items.
- The ask-before-saving setting changes the `downloads.download({ saveAs })` behavior.
- No server calls are made except browser-initiated downloads from detected Instagram media URLs.

## Known Limitations

Instagram frequently changes DOM structure and may serve media through short-lived URLs. Some video sources may not be exposed as direct downloadable URLs in the DOM. The first version will favor a narrow, low-permission detector over aggressive network interception.
