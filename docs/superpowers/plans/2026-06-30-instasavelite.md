# InstaSaveLite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome, Edge, and Firefox WebExtension that downloads Instagram images and videos already visible to the user.

**Architecture:** Use a Manifest V3 extension with vanilla JavaScript and `webextension-polyfill`. Content scripts detect visible Instagram media and inject a compact download button; the popup lists detected items; the background service worker owns `downloads.download` and storage defaults.

**Tech Stack:** Manifest V3, vanilla JavaScript, CSS, Node.js built-in `node:test`, `webextension-polyfill`, browser `downloads`, `storage`, and tab messaging APIs.

## Global Constraints

- The extension only detects media present in pages the user can normally open.
- No login automation, private account bypass, deleted content access, paid content access, DRM bypass, region lock bypass, background scraping, or bulk crawling across accounts.
- No server backend, analytics, telemetry, or remote logging.
- Support Chrome, Edge, and Firefox with Manifest V3.
- Use vanilla JavaScript and no build step.
- Use `webextension-polyfill` and the promise-based `browser.*` namespace.
- Store settings in `browser.storage.sync` when available.
- Avoid broad network interception permissions such as `webRequest`.
- Host permissions are limited to `https://www.instagram.com/*`, `https://*.cdninstagram.com/*`, and `https://*.fbcdn.net/*`.

---

## File Structure

- Create `manifest.json`: Manifest V3 metadata, permissions, content scripts, background worker, popup, icons, and Firefox gecko settings.
- Create `README.md`: installation, usage, scope boundaries, project structure, and test command.
- Create `icons/icon16.svg`, `icons/icon48.svg`, `icons/icon128.svg`: simple extension-owned SVG icons.
- Create `styles/content.css`: styling for the in-page download button.
- Create `src/vendor/browser-polyfill.min.js`: local minimal polyfill shim for unpacked development when the real polyfill file is not installed.
- Create `src/shared/constants.js`: message types, defaults, selectors, and extension constants.
- Create `src/shared/media.js`: pure functions for URL normalization, srcset parsing, media filtering, candidate scoring, filename generation, and dedupe.
- Create `src/shared/storage.js`: pure default merge plus browser storage helpers.
- Create `src/content/detector.js`: DOM scanning and media candidate extraction.
- Create `src/content/overlay-button.js`: in-page button lifecycle and click handling.
- Create `src/content/index.js`: content bootstrap, SPA route observation, cached candidate list, and message listener.
- Create `src/background/service-worker.js`: install defaults and download request handling.
- Create `src/popup/popup.html`: popup markup.
- Create `src/popup/popup.css`: popup styling.
- Create `src/popup/popup.js`: active tab messaging, media list rendering, download actions, and setting toggle.
- Create `test/media.test.js`: tests for `src/shared/media.js`.
- Create `test/storage.test.js`: tests for `src/shared/storage.js`.
- Create `test/run-all.js`: Node test runner.

---

### Task 1: Shared Media Logic

**Files:**
- Create: `src/shared/constants.js`
- Create: `src/shared/media.js`
- Create: `test/media.test.js`
- Create: `test/run-all.js`

**Interfaces:**
- Produces: `InstaSaveLite.constants.DEFAULT_SETTINGS`, `InstaSaveLite.constants.MESSAGE_TYPES`.
- Produces: `InstaSaveLite.media.parseSrcset(srcset: string): Array<{ url: string, width: number | null }>`
- Produces: `InstaSaveLite.media.normalizeMediaUrl(url: string, baseUrl?: string): string | null`
- Produces: `InstaSaveLite.media.getExtensionForMedia(type: "image" | "video", url: string): string`
- Produces: `InstaSaveLite.media.createFilename(media: { type: string, index?: number, url?: string }, now?: Date): string`
- Produces: `InstaSaveLite.media.isLikelyUiAsset(candidate: { width?: number, height?: number, url?: string, type?: string }): boolean`
- Produces: `InstaSaveLite.media.scoreCandidate(candidate: { type: string, width?: number, height?: number, visible?: boolean, inViewport?: boolean }): number`
- Produces: `InstaSaveLite.media.dedupeCandidates(candidates: Array<object>): Array<object>`
- Consumes: no project code.

- [ ] **Step 1: Create the failing media tests**

Create `test/media.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");

require("../src/shared/constants.js");
require("../src/shared/media.js");

const media = globalThis.InstaSaveLite.media;

test("parseSrcset returns URLs and numeric widths", () => {
  assert.deepEqual(
    media.parseSrcset("https://cdn.example/a.jpg 640w, https://cdn.example/b.jpg 1080w"),
    [
      { url: "https://cdn.example/a.jpg", width: 640 },
      { url: "https://cdn.example/b.jpg", width: 1080 }
    ]
  );
});

test("normalizeMediaUrl rejects unsupported protocols and keeps Instagram CDN URLs", () => {
  assert.equal(media.normalizeMediaUrl("javascript:alert(1)"), null);
  assert.equal(media.normalizeMediaUrl("data:image/png;base64,abc"), null);
  assert.equal(
    media.normalizeMediaUrl("https://scontent.cdninstagram.com/v/t51.29350-15/example.jpg?x=1#frag"),
    "https://scontent.cdninstagram.com/v/t51.29350-15/example.jpg?x=1"
  );
});

test("createFilename includes date, type, padded index, and extension", () => {
  const name = media.createFilename(
    { type: "image", index: 2, url: "https://example.com/photo.webp?token=abc" },
    new Date("2026-06-30T12:00:00Z")
  );
  assert.equal(name, "instagram-2026-06-30-image-02.webp");
});

test("isLikelyUiAsset filters small images and avatar URLs", () => {
  assert.equal(media.isLikelyUiAsset({ type: "image", width: 32, height: 32, url: "https://example.com/icon.jpg" }), true);
  assert.equal(media.isLikelyUiAsset({ type: "image", width: 1080, height: 1350, url: "https://example.com/avatar/profile.jpg" }), true);
  assert.equal(media.isLikelyUiAsset({ type: "image", width: 1080, height: 1350, url: "https://example.com/post.jpg" }), false);
});

test("scoreCandidate prefers visible viewport videos and large images", () => {
  const smallHidden = media.scoreCandidate({ type: "image", width: 150, height: 150, visible: false, inViewport: false });
  const largeVisible = media.scoreCandidate({ type: "image", width: 1080, height: 1350, visible: true, inViewport: true });
  const videoVisible = media.scoreCandidate({ type: "video", width: 720, height: 1280, visible: true, inViewport: true });

  assert.ok(largeVisible > smallHidden);
  assert.ok(videoVisible > largeVisible);
});

test("dedupeCandidates keeps the highest scoring candidate per normalized URL", () => {
  const result = media.dedupeCandidates([
    { id: "a", type: "image", url: "https://example.com/a.jpg#one", width: 100, height: 100, visible: true },
    { id: "b", type: "image", url: "https://example.com/a.jpg#two", width: 1080, height: 1080, visible: true },
    { id: "c", type: "video", url: "https://example.com/c.mp4", width: 720, height: 1280, visible: true }
  ]);

  assert.deepEqual(result.map((item) => item.id), ["c", "b"]);
});
```

Create `test/run-all.js`:

```js
const { spawnSync } = require("node:child_process");

const files = [
  "test/media.test.js",
  "test/storage.test.js"
].filter((file) => require("node:fs").existsSync(file));

const result = spawnSync(process.execPath, ["--test", ...files], {
  stdio: "inherit",
  shell: false
});

process.exit(result.status ?? 1);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node test/run-all.js`

Expected: FAIL with a module not found error for `../src/shared/constants.js` or `../src/shared/media.js`.

- [ ] **Step 3: Implement shared media logic**

Create `src/shared/constants.js`:

```js
(function initConstants(globalScope) {
  const root = globalScope.InstaSaveLite || (globalScope.InstaSaveLite = {});

  root.constants = {
    EXTENSION_NAME: "InstaSaveLite",
    DEFAULT_SETTINGS: {
      askWhereToSave: false
    },
    MESSAGE_TYPES: {
      GET_MEDIA: "INSTASAVELITE_GET_MEDIA",
      DOWNLOAD_MEDIA: "INSTASAVELITE_DOWNLOAD_MEDIA",
      DOWNLOAD_COMPLETE: "INSTASAVELITE_DOWNLOAD_COMPLETE",
      DOWNLOAD_FAILED: "INSTASAVELITE_DOWNLOAD_FAILED",
      GET_SETTINGS: "INSTASAVELITE_GET_SETTINGS",
      SAVE_SETTINGS: "INSTASAVELITE_SAVE_SETTINGS"
    },
    INSTAGRAM_HOST_PATTERN: /(^|\.)instagram\.com$/i,
    CDN_HOST_PATTERN: /(^|\.)cdninstagram\.com$|(^|\.)fbcdn\.net$/i
  };
})(globalThis);
```

Create `src/shared/media.js`:

```js
(function initMedia(globalScope) {
  const root = globalScope.InstaSaveLite || (globalScope.InstaSaveLite = {});

  function parseSrcset(srcset) {
    if (!srcset || typeof srcset !== "string") {
      return [];
    }

    return srcset
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [url, descriptor] = part.split(/\s+/);
        const widthMatch = descriptor ? descriptor.match(/^(\d+)w$/) : null;
        return { url, width: widthMatch ? Number(widthMatch[1]) : null };
      })
      .filter((item) => Boolean(item.url));
  }

  function normalizeMediaUrl(url, baseUrl) {
    if (!url || typeof url !== "string") {
      return null;
    }

    try {
      const parsed = new URL(url, baseUrl || "https://www.instagram.com/");
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return null;
      }
      parsed.hash = "";
      return parsed.toString();
    } catch (_error) {
      return null;
    }
  }

  function getExtensionForMedia(type, url) {
    const normalized = normalizeMediaUrl(url);
    const pathname = normalized ? new URL(normalized).pathname.toLowerCase() : "";
    const match = pathname.match(/\.([a-z0-9]{2,5})$/);
    const extension = match ? match[1] : "";

    if (["jpg", "jpeg", "png", "webp", "gif", "mp4", "mov", "m4v"].includes(extension)) {
      return extension === "jpeg" ? "jpg" : extension;
    }

    return type === "video" ? "mp4" : "jpg";
  }

  function createFilename(media, now) {
    const date = now || new Date();
    const yyyy = String(date.getUTCFullYear());
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");
    const index = String(media.index || 1).padStart(2, "0");
    const type = media.type === "video" ? "video" : "image";
    const extension = getExtensionForMedia(type, media.url);

    return `instagram-${yyyy}-${mm}-${dd}-${type}-${index}.${extension}`;
  }

  function isLikelyUiAsset(candidate) {
    const width = Number(candidate.width || 0);
    const height = Number(candidate.height || 0);
    const url = String(candidate.url || "").toLowerCase();
    const minDimension = Math.min(width, height);

    if (candidate.type === "image" && width > 0 && height > 0 && minDimension < 180) {
      return true;
    }

    return /avatar|profile|sprite|icon|static|emoji/.test(url);
  }

  function scoreCandidate(candidate) {
    const width = Number(candidate.width || 0);
    const height = Number(candidate.height || 0);
    const areaScore = Math.min((width * height) / 10000, 250);
    const visibilityScore = candidate.visible ? 100 : 0;
    const viewportScore = candidate.inViewport ? 100 : 0;
    const typeScore = candidate.type === "video" ? 80 : 0;

    return Math.round(areaScore + visibilityScore + viewportScore + typeScore);
  }

  function dedupeCandidates(candidates) {
    const byUrl = new Map();

    for (const candidate of candidates) {
      const normalized = normalizeMediaUrl(candidate.url);
      if (!normalized || isLikelyUiAsset(candidate)) {
        continue;
      }

      const enriched = {
        ...candidate,
        url: normalized,
        score: candidate.score ?? scoreCandidate(candidate)
      };
      const current = byUrl.get(normalized);

      if (!current || enriched.score > current.score) {
        byUrl.set(normalized, enriched);
      }
    }

    return Array.from(byUrl.values()).sort((a, b) => b.score - a.score);
  }

  root.media = {
    parseSrcset,
    normalizeMediaUrl,
    getExtensionForMedia,
    createFilename,
    isLikelyUiAsset,
    scoreCandidate,
    dedupeCandidates
  };
})(globalThis);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node test/run-all.js`

Expected: PASS with all `media.test.js` tests passing.

- [ ] **Step 5: Commit Task 1**

Run:

```bash
git add src/shared/constants.js src/shared/media.js test/media.test.js test/run-all.js
git commit -m "Add shared media utilities"
```

---

### Task 2: Storage Defaults and Browser API Helpers

**Files:**
- Create: `src/shared/storage.js`
- Create: `test/storage.test.js`

**Interfaces:**
- Consumes: `InstaSaveLite.constants.DEFAULT_SETTINGS`.
- Produces: `InstaSaveLite.storage.mergeSettings(input: object): { askWhereToSave: boolean }`
- Produces: `InstaSaveLite.storage.getSettings(): Promise<{ askWhereToSave: boolean }>`
- Produces: `InstaSaveLite.storage.saveSettings(settings: object): Promise<{ askWhereToSave: boolean }>`

- [ ] **Step 1: Create the failing storage tests**

Create `test/storage.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");

require("../src/shared/constants.js");
require("../src/shared/storage.js");

const storage = globalThis.InstaSaveLite.storage;

test("mergeSettings returns defaults for missing input", () => {
  assert.deepEqual(storage.mergeSettings(), { askWhereToSave: false });
});

test("mergeSettings preserves boolean askWhereToSave", () => {
  assert.deepEqual(storage.mergeSettings({ askWhereToSave: true }), { askWhereToSave: true });
  assert.deepEqual(storage.mergeSettings({ askWhereToSave: false }), { askWhereToSave: false });
});

test("mergeSettings ignores non-boolean askWhereToSave", () => {
  assert.deepEqual(storage.mergeSettings({ askWhereToSave: "yes" }), { askWhereToSave: false });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node test/run-all.js`

Expected: FAIL with a module not found error for `../src/shared/storage.js`.

- [ ] **Step 3: Implement storage helpers**

Create `src/shared/storage.js`:

```js
(function initStorage(globalScope) {
  const root = globalScope.InstaSaveLite || (globalScope.InstaSaveLite = {});
  const defaults = root.constants.DEFAULT_SETTINGS;

  function getBrowserApi() {
    return globalScope.browser || globalScope.chrome;
  }

  function mergeSettings(input) {
    const settings = { ...defaults };
    if (input && typeof input.askWhereToSave === "boolean") {
      settings.askWhereToSave = input.askWhereToSave;
    }
    return settings;
  }

  async function getSettings() {
    const api = getBrowserApi();
    if (!api || !api.storage || !api.storage.sync) {
      return mergeSettings();
    }
    const values = await api.storage.sync.get(defaults);
    return mergeSettings(values);
  }

  async function saveSettings(settings) {
    const merged = mergeSettings(settings);
    const api = getBrowserApi();
    if (api && api.storage && api.storage.sync) {
      await api.storage.sync.set(merged);
    }
    return merged;
  }

  root.storage = {
    mergeSettings,
    getSettings,
    saveSettings
  };
})(globalThis);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node test/run-all.js`

Expected: PASS with `media.test.js` and `storage.test.js` passing.

- [ ] **Step 5: Commit Task 2**

Run:

```bash
git add src/shared/storage.js test/storage.test.js
git commit -m "Add settings storage helpers"
```

---

### Task 3: Extension Scaffold and Metadata

**Files:**
- Create: `manifest.json`
- Create: `README.md`
- Create: `icons/icon16.svg`
- Create: `icons/icon48.svg`
- Create: `icons/icon128.svg`
- Create: `styles/content.css`
- Create: `src/vendor/browser-polyfill.min.js`

**Interfaces:**
- Consumes: no runtime interfaces from earlier tasks.
- Produces: browser-loadable Manifest V3 extension shell.

- [ ] **Step 1: Create metadata and UI assets**

Create `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "InstaSaveLite",
  "version": "0.1.0",
  "description": "Download Instagram images and videos already visible in your browser.",
  "icons": {
    "16": "icons/icon16.svg",
    "48": "icons/icon48.svg",
    "128": "icons/icon128.svg"
  },
  "permissions": ["storage", "downloads", "activeTab"],
  "host_permissions": [
    "https://www.instagram.com/*",
    "https://*.cdninstagram.com/*",
    "https://*.fbcdn.net/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://www.instagram.com/*"],
      "js": [
        "src/vendor/browser-polyfill.min.js",
        "src/shared/constants.js",
        "src/shared/media.js",
        "src/shared/storage.js",
        "src/content/detector.js",
        "src/content/overlay-button.js",
        "src/content/index.js"
      ],
      "css": ["styles/content.css"],
      "run_at": "document_idle"
    }
  ],
  "background": {
    "service_worker": "src/background/service-worker.js"
  },
  "action": {
    "default_title": "InstaSaveLite",
    "default_popup": "src/popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.svg",
      "48": "icons/icon48.svg",
      "128": "icons/icon128.svg"
    }
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "instasavelite@extension",
      "strict_min_version": "109.0"
    }
  }
}
```

Create each icon file with this SVG content, adjusting only width and height to match the file name:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="10" fill="#111827"/>
  <path d="M24 9v22" stroke="#f9fafb" stroke-width="4" stroke-linecap="round"/>
  <path d="M15 23l9 9 9-9" fill="none" stroke="#f9fafb" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M13 38h22" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
</svg>
```

Create `src/vendor/browser-polyfill.min.js`:

```js
globalThis.browser=globalThis.browser||globalThis.chrome;
```

Create `styles/content.css`:

```css
.instasavelite-download-button {
  align-items: center;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.25);
  color: #f8fafc;
  cursor: pointer;
  display: inline-flex;
  font: 600 13px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  gap: 6px;
  min-height: 34px;
  padding: 0 12px;
  position: fixed;
  right: 18px;
  top: 86px;
  z-index: 2147483647;
}

.instasavelite-download-button:hover {
  background: #1e293b;
}

.instasavelite-download-button[hidden] {
  display: none;
}
```

Create `README.md`:

```md
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
```

- [ ] **Step 2: Verify manifest JSON parses**

Run:

```bash
node -e "JSON.parse(require('node:fs').readFileSync('manifest.json','utf8')); console.log('manifest ok')"
```

Expected: `manifest ok`

- [ ] **Step 3: Run tests to verify scaffold did not break shared logic**

Run: `node test/run-all.js`

Expected: PASS.

- [ ] **Step 4: Commit Task 3**

Run:

```bash
git add manifest.json README.md icons styles src/vendor
git commit -m "Add extension scaffold"
```

---

### Task 4: Content Detection and Overlay Button

**Files:**
- Create: `src/content/detector.js`
- Create: `src/content/overlay-button.js`
- Create: `src/content/index.js`
- Modify: `test/media.test.js`

**Interfaces:**
- Consumes: `InstaSaveLite.media.parseSrcset`, `normalizeMediaUrl`, `dedupeCandidates`, `createFilename`.
- Produces: `InstaSaveLite.detector.collectMediaCandidates(documentRef?: Document): Array<MediaCandidate>`
- Produces: `InstaSaveLite.overlay.createDownloadButton({ onClick: Function }): HTMLButtonElement`
- Produces: content message handler for `INSTASAVELITE_GET_MEDIA` and `INSTASAVELITE_DOWNLOAD_MEDIA`.

- [ ] **Step 1: Add failing candidate preparation test**

Append to `test/media.test.js`:

```js
test("createFilename defaults unknown image URLs to jpg", () => {
  const name = media.createFilename(
    { type: "image", index: 1, url: "https://example.com/media?id=123" },
    new Date("2026-06-30T12:00:00Z")
  );
  assert.equal(name, "instagram-2026-06-30-image-01.jpg");
});
```

- [ ] **Step 2: Run tests to verify the new test passes or fails for the right reason**

Run: `node test/run-all.js`

Expected: PASS if Task 1 already implemented the default extension behavior. If it fails, the failure must mention the filename extension.

- [ ] **Step 3: Implement detector and overlay**

Create `src/content/detector.js`:

```js
(function initDetector(globalScope) {
  const root = globalScope.InstaSaveLite || (globalScope.InstaSaveLite = {});
  const media = root.media;

  function isVisibleElement(element) {
    const rect = element.getBoundingClientRect();
    const style = globalScope.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  }

  function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    const width = globalScope.innerWidth || document.documentElement.clientWidth;
    const height = globalScope.innerHeight || document.documentElement.clientHeight;
    return rect.bottom > 0 && rect.right > 0 && rect.top < height && rect.left < width;
  }

  function candidateFromElement(element, type, url, index) {
    const normalized = media.normalizeMediaUrl(url, document.baseURI);
    if (!normalized) {
      return null;
    }

    const rect = element.getBoundingClientRect();
    return {
      id: `${type}-${index}`,
      type,
      url: normalized,
      pageUrl: globalScope.location.href,
      width: element.naturalWidth || element.videoWidth || Math.round(rect.width),
      height: element.naturalHeight || element.videoHeight || Math.round(rect.height),
      visible: isVisibleElement(element),
      inViewport: isInViewport(element)
    };
  }

  function collectImageCandidates(documentRef) {
    const doc = documentRef || document;
    const images = Array.from(doc.querySelectorAll("img[src]"));
    const pictureSources = Array.from(doc.querySelectorAll("picture source[srcset]"));
    const candidates = [];

    images.forEach((img, index) => {
      const srcsetItems = media.parseSrcset(img.getAttribute("srcset") || "");
      const bestSrcset = srcsetItems.sort((a, b) => (b.width || 0) - (a.width || 0))[0];
      const url = bestSrcset ? bestSrcset.url : img.currentSrc || img.src;
      const candidate = candidateFromElement(img, "image", url, index);
      if (candidate) {
        candidates.push(candidate);
      }
    });

    pictureSources.forEach((source, index) => {
      const srcsetItems = media.parseSrcset(source.getAttribute("srcset") || "");
      const bestSrcset = srcsetItems.sort((a, b) => (b.width || 0) - (a.width || 0))[0];
      const picture = source.closest("picture");
      const img = picture ? picture.querySelector("img") : null;
      if (bestSrcset && img) {
        const candidate = candidateFromElement(img, "image", bestSrcset.url, images.length + index);
        if (candidate) {
          candidates.push(candidate);
        }
      }
    });

    return candidates;
  }

  function collectVideoCandidates(documentRef) {
    const doc = documentRef || document;
    const videos = Array.from(doc.querySelectorAll("video"));
    const candidates = [];

    videos.forEach((video, index) => {
      const source = video.currentSrc || video.src || (video.querySelector("source[src]") || {}).src;
      const candidate = candidateFromElement(video, "video", source, index);
      if (candidate) {
        candidates.push(candidate);
      }
    });

    return candidates;
  }

  function collectMediaCandidates(documentRef) {
    return media.dedupeCandidates([
      ...collectVideoCandidates(documentRef),
      ...collectImageCandidates(documentRef)
    ]).map((candidate, index) => ({
      ...candidate,
      index: index + 1,
      filename: media.createFilename({ ...candidate, index: index + 1 })
    }));
  }

  root.detector = {
    collectMediaCandidates
  };
})(globalThis);
```

Create `src/content/overlay-button.js`:

```js
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
```

Create `src/content/index.js`:

```js
(function initContent(globalScope) {
  const root = globalScope.InstaSaveLite;
  const browserApi = globalScope.browser || globalScope.chrome;
  const messageTypes = root.constants.MESSAGE_TYPES;
  let cachedCandidates = [];
  let button = null;

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
    globalScope.setTimeout(() => {
      refreshCandidates();
      ensureButton();
    }, 250);
  }

  browserApi.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== messageTypes.GET_MEDIA) {
      return undefined;
    }
    return Promise.resolve({ items: refreshCandidates() });
  });

  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  scheduleRefresh();
})(globalThis);
```

- [ ] **Step 4: Run tests and inspect content files for syntax**

Run:

```bash
node test/run-all.js
node --check src/content/detector.js
node --check src/content/overlay-button.js
node --check src/content/index.js
```

Expected: each command exits 0.

- [ ] **Step 5: Commit Task 4**

Run:

```bash
git add src/content test/media.test.js
git commit -m "Add Instagram media detector"
```

---

### Task 5: Background Downloads

**Files:**
- Create: `src/background/service-worker.js`

**Interfaces:**
- Consumes: `InstaSaveLite.constants.MESSAGE_TYPES`, `InstaSaveLite.constants.DEFAULT_SETTINGS`, `InstaSaveLite.storage.getSettings`.
- Produces: background listener for `INSTASAVELITE_DOWNLOAD_MEDIA`.

- [ ] **Step 1: Implement background worker**

Create `src/background/service-worker.js`:

```js
importScripts("../vendor/browser-polyfill.min.js");
importScripts("../shared/constants.js");
importScripts("../shared/storage.js");

const root = globalThis.InstaSaveLite;
const browserApi = globalThis.browser || globalThis.chrome;
const messageTypes = root.constants.MESSAGE_TYPES;

browserApi.runtime.onInstalled.addListener(() => {
  root.storage.saveSettings(root.constants.DEFAULT_SETTINGS);
});

async function downloadItem(item, saveAs) {
  if (!item || !item.url || !item.filename) {
    throw new Error("Missing download item URL or filename");
  }

  return browserApi.downloads.download({
    url: item.url,
    filename: item.filename,
    saveAs,
    conflictAction: "uniquify"
  });
}

browserApi.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== messageTypes.DOWNLOAD_MEDIA) {
    return undefined;
  }

  return (async () => {
    const settings = await root.storage.getSettings();
    const items = Array.isArray(message.payload && message.payload.items) ? message.payload.items : [];
    const downloadIds = [];

    for (const item of items) {
      downloadIds.push(await downloadItem(item, settings.askWhereToSave));
    }

    return {
      type: messageTypes.DOWNLOAD_COMPLETE,
      payload: { downloadIds }
    };
  })().catch((error) => ({
    type: messageTypes.DOWNLOAD_FAILED,
    payload: { message: error.message }
  }));
});
```

- [ ] **Step 2: Run syntax checks and tests**

Run:

```bash
node --check src/background/service-worker.js
node test/run-all.js
```

Expected: both commands exit 0.

- [ ] **Step 3: Commit Task 5**

Run:

```bash
git add src/background/service-worker.js
git commit -m "Add background downloads"
```

---

### Task 6: Popup UI

**Files:**
- Create: `src/popup/popup.html`
- Create: `src/popup/popup.css`
- Create: `src/popup/popup.js`

**Interfaces:**
- Consumes: `INSTASAVELITE_GET_MEDIA`, `INSTASAVELITE_DOWNLOAD_MEDIA`, `GET_SETTINGS`, `SAVE_SETTINGS`.
- Produces: toolbar popup for detected media, one-item download, all-item download, and `askWhereToSave` setting.

- [ ] **Step 1: Create popup files**

Create `src/popup/popup.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="popup.css">
    <title>InstaSaveLite</title>
  </head>
  <body>
    <main class="popup-shell">
      <header class="popup-header">
        <h1>InstaSaveLite</h1>
        <button id="downloadAllButton" type="button">Download all</button>
      </header>
      <label class="setting-row">
        <input id="askWhereToSaveInput" type="checkbox">
        <span>Ask where to save</span>
      </label>
      <p id="statusText" class="status-text">Scanning this tab...</p>
      <ul id="mediaList" class="media-list"></ul>
    </main>
    <script src="../vendor/browser-polyfill.min.js"></script>
    <script src="../shared/constants.js"></script>
    <script src="../shared/storage.js"></script>
    <script src="popup.js"></script>
  </body>
</html>
```

Create `src/popup/popup.css`:

```css
* {
  box-sizing: border-box;
}

body {
  background: #f8fafc;
  color: #111827;
  font: 14px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  margin: 0;
  min-width: 340px;
}

button {
  background: #0f172a;
  border: 0;
  border-radius: 6px;
  color: #f8fafc;
  cursor: pointer;
  font: inherit;
  font-weight: 650;
  padding: 8px 10px;
}

button:disabled {
  cursor: default;
  opacity: 0.45;
}

.popup-shell {
  padding: 14px;
}

.popup-header {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 12px;
}

.popup-header h1 {
  font-size: 16px;
  line-height: 1.1;
  margin: 0;
}

.setting-row {
  align-items: center;
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.status-text {
  color: #475569;
  margin: 0 0 10px;
}

.media-list {
  display: grid;
  gap: 8px;
  list-style: none;
  margin: 0;
  max-height: 420px;
  overflow: auto;
  padding: 0;
}

.media-item {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  display: grid;
  gap: 10px;
  grid-template-columns: 54px 1fr auto;
  padding: 8px;
}

.media-preview {
  align-items: center;
  background: #e2e8f0;
  border-radius: 6px;
  color: #334155;
  display: flex;
  font-size: 12px;
  font-weight: 700;
  height: 54px;
  justify-content: center;
  overflow: hidden;
  text-transform: uppercase;
  width: 54px;
}

.media-preview img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.media-meta {
  min-width: 0;
}

.media-title {
  font-weight: 700;
}

.media-detail {
  color: #64748b;
  font-size: 12px;
}
```

Create `src/popup/popup.js`:

```js
(function initPopup(globalScope) {
  const root = globalScope.InstaSaveLite;
  const browserApi = globalScope.browser || globalScope.chrome;
  const messageTypes = root.constants.MESSAGE_TYPES;
  const list = document.getElementById("mediaList");
  const statusText = document.getElementById("statusText");
  const downloadAllButton = document.getElementById("downloadAllButton");
  const askWhereToSaveInput = document.getElementById("askWhereToSaveInput");
  let mediaItems = [];

  async function getActiveTab() {
    const tabs = await browserApi.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  async function sendToActiveTab(message) {
    const tab = await getActiveTab();
    if (!tab || !tab.id) {
      throw new Error("No active tab found");
    }
    return browserApi.tabs.sendMessage(tab.id, message);
  }

  async function requestMedia() {
    const response = await sendToActiveTab({ type: messageTypes.GET_MEDIA });
    return Array.isArray(response && response.items) ? response.items : [];
  }

  async function downloadItems(items) {
    const response = await browserApi.runtime.sendMessage({
      type: messageTypes.DOWNLOAD_MEDIA,
      payload: { items }
    });

    if (response && response.type === messageTypes.DOWNLOAD_FAILED) {
      throw new Error(response.payload.message);
    }
  }

  function renderItems() {
    list.textContent = "";
    downloadAllButton.disabled = mediaItems.length === 0;

    if (!mediaItems.length) {
      statusText.textContent = "No visible Instagram media detected on this tab.";
      return;
    }

    statusText.textContent = `${mediaItems.length} item${mediaItems.length === 1 ? "" : "s"} detected.`;

    mediaItems.forEach((item) => {
      const row = document.createElement("li");
      row.className = "media-item";

      const preview = document.createElement("div");
      preview.className = "media-preview";
      if (item.type === "image") {
        const image = document.createElement("img");
        image.alt = "";
        image.src = item.url;
        preview.appendChild(image);
      } else {
        preview.textContent = "Video";
      }

      const meta = document.createElement("div");
      meta.className = "media-meta";
      const title = document.createElement("div");
      title.className = "media-title";
      title.textContent = item.type === "video" ? "Video" : "Image";
      const detail = document.createElement("div");
      detail.className = "media-detail";
      detail.textContent = item.width && item.height ? `${item.width} x ${item.height}` : item.filename;
      meta.append(title, detail);

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Save";
      button.addEventListener("click", async () => {
        button.disabled = true;
        statusText.textContent = "Starting download...";
        try {
          await downloadItems([item]);
          statusText.textContent = "Download started.";
        } catch (error) {
          statusText.textContent = error.message;
        } finally {
          button.disabled = false;
        }
      });

      row.append(preview, meta, button);
      list.appendChild(row);
    });
  }

  async function loadSettings() {
    const settings = await root.storage.getSettings();
    askWhereToSaveInput.checked = settings.askWhereToSave;
  }

  askWhereToSaveInput.addEventListener("change", async () => {
    await root.storage.saveSettings({ askWhereToSave: askWhereToSaveInput.checked });
  });

  downloadAllButton.addEventListener("click", async () => {
    downloadAllButton.disabled = true;
    statusText.textContent = "Starting downloads...";
    try {
      await downloadItems(mediaItems);
      statusText.textContent = "Downloads started.";
    } catch (error) {
      statusText.textContent = error.message;
    } finally {
      downloadAllButton.disabled = mediaItems.length === 0;
    }
  });

  (async () => {
    try {
      await loadSettings();
      mediaItems = await requestMedia();
      renderItems();
    } catch (error) {
      statusText.textContent = error.message;
      downloadAllButton.disabled = true;
    }
  })();
})(globalThis);
```

- [ ] **Step 2: Run syntax checks and tests**

Run:

```bash
node --check src/popup/popup.js
node test/run-all.js
```

Expected: both commands exit 0.

- [ ] **Step 3: Commit Task 6**

Run:

```bash
git add src/popup
git commit -m "Add media download popup"
```

---

### Task 7: Final Verification and Manual Test Notes

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: completed extension.
- Produces: documented manual verification checklist.

- [ ] **Step 1: Add manual verification checklist to README**

Append to `README.md`:

```md

## Manual Verification

- Chrome: load the folder in `chrome://extensions` with Developer mode enabled.
- Firefox: load `manifest.json` from `about:debugging#/runtime/this-firefox`.
- Open an Instagram image post and confirm the popup lists at least one image.
- Open an Instagram Reel or video post and confirm the popup lists a video when Instagram exposes a direct media URL in the DOM.
- Click the in-page Download button and confirm a download starts.
- Toggle Ask where to save, then download one item and confirm the browser prompts for a destination.
- Use Download all on a carousel post and confirm duplicate URLs are not downloaded twice.
```

- [ ] **Step 2: Run full automated verification**

Run:

```bash
node test/run-all.js
node --check src/shared/constants.js
node --check src/shared/media.js
node --check src/shared/storage.js
node --check src/content/detector.js
node --check src/content/overlay-button.js
node --check src/content/index.js
node --check src/background/service-worker.js
node --check src/popup/popup.js
node -e "JSON.parse(require('node:fs').readFileSync('manifest.json','utf8')); console.log('manifest ok')"
```

Expected: all commands exit 0 and the manifest command prints `manifest ok`.

- [ ] **Step 3: Review git diff**

Run:

```bash
git status --short
git diff --check
```

Expected: `git diff --check` exits 0. `git status --short` shows only the final README change if Task 7 is not committed yet.

- [ ] **Step 4: Commit Task 7**

Run:

```bash
git add README.md
git commit -m "Document manual verification"
```

---

## Plan Self-Review

- Spec coverage: Tasks 1 and 4 cover media normalization, srcset parsing, duplicate filtering, filename generation, candidate scoring, DOM detection, and in-page button. Task 2 covers storage defaults. Task 3 covers MV3, permissions, cross-browser metadata, polyfill, icons, CSS, and README. Task 5 covers downloads API and default settings on install. Task 6 covers popup list, one item download, all item download, error states, and ask-before-saving setting. Task 7 covers final automated and manual verification.
- Placeholder scan: no task uses unfinished-marker language or unspecified error handling.
- Type consistency: message type names, settings key `askWhereToSave`, media fields, and function names are consistent across tasks.
