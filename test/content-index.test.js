const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const scriptPath = path.join(__dirname, "../src/content/index.js");
const scriptSource = fs.readFileSync(scriptPath, "utf8");

function loadContentScript() {
  const timers = [];
  const clearedTimers = [];
  const observers = [];
  const listeners = [];
  const sentMessages = [];
  let createdButton = null;
  let detectorCandidates = [];
  let hasActiveMediaContext = true;
  let nextTimerId = 1;

  const documentElement = {
    contains: () => false
  };

  const document = {
    documentElement
  };

  const context = {
    console,
    globalThis: null,
    document,
    browser: {
      runtime: {
        onMessage: {
          addListener(listener) {
            listeners.push(listener);
          }
        },
        sendMessage(message) {
          sentMessages.push(message);
          return Promise.resolve();
        }
      }
    },
    MutationObserver: class {
      constructor(callback) {
        this.callback = callback;
        observers.push(this);
      }

      observe(target, options) {
        this.target = target;
        this.options = options;
      }
    },
    setTimeout(fn, delay) {
      const timer = { id: nextTimerId++, fn, delay };
      timers.push(timer);
      return timer.id;
    },
    clearTimeout(id) {
      clearedTimers.push(id);
      const index = timers.findIndex((timer) => timer.id === id);
      if (index !== -1) {
        timers.splice(index, 1);
      }
    },
    clearImmediate() {},
    setImmediate() {},
    Promise
  };

  context.globalThis = context;
  context.InstaSaveLite = {
    constants: {
      MESSAGE_TYPES: {
        GET_MEDIA: "GET_MEDIA",
        DOWNLOAD_MEDIA: "DOWNLOAD_MEDIA"
      }
    },
    detector: {
      collectMediaCandidates() {
        return detectorCandidates;
      },
      hasActiveMediaContext() {
        return hasActiveMediaContext;
      }
    },
    overlay: {
      createDownloadButton(options) {
        createdButton = {
          hidden: false,
          style: {},
          click() {
            return options.onClick();
          }
        };
        return createdButton;
      },
      positionDownloadButton(button, candidate) {
        button.positionedFor = candidate && candidate.id;
      }
    }
  };

  vm.runInNewContext(scriptSource, context, { filename: scriptPath });

  return {
    timers,
    clearedTimers,
    observers,
    listeners,
    document,
    sentMessages,
    get createdButton() {
      return createdButton;
    },
    set detectorCandidates(value) {
      detectorCandidates = value;
    },
    set hasActiveMediaContext(value) {
      hasActiveMediaContext = value;
    }
  };
}

test("observes media attribute changes that Instagram mutates in place", () => {
  const { observers } = loadContentScript();
  assert.equal(observers.length, 1);
  assert.equal(observers[0].options.childList, true);
  assert.equal(observers[0].options.subtree, true);
  assert.equal(observers[0].options.attributes, true);
  assert.deepEqual(Array.from(observers[0].options.attributeFilter), ["src", "srcset", "poster", "style", "class"]);
});

test("debounces refresh scheduling during rapid mutation bursts", () => {
  const { timers, clearedTimers, observers } = loadContentScript();

  observers[0].callback([]);
  observers[0].callback([]);

  assert.equal(timers.length, 1);
  assert.deepEqual(clearedTimers, [1, 2]);
});

test("downloadBestCandidate prefers the first in-viewport candidate", async () => {
  const env = loadContentScript();
  env.detectorCandidates = [
    { id: "image-1", type: "image", url: "https://example.com/offscreen.jpg", inViewport: false, viewportArea: 0 },
    { id: "image-2", type: "image", url: "https://example.com/onscreen.jpg", inViewport: true, viewportArea: 120000 }
  ];

  env.timers[0].fn();
  await env.createdButton.click();

  assert.equal(env.sentMessages.length, 1);
  assert.equal(env.sentMessages[0].payload.items[0].id, "image-2");
});

test("downloadBestCandidate chooses the carousel slide with the largest viewport area", async () => {
  const env = loadContentScript();
  env.detectorCandidates = [
    { id: "image-1", type: "image", url: "https://example.com/first.jpg", inViewport: true, viewportArea: 30000 },
    { id: "image-2", type: "image", url: "https://example.com/second.jpg", inViewport: true, viewportArea: 240000 }
  ];

  env.timers[0].fn();
  await env.createdButton.click();

  assert.equal(env.sentMessages[0].payload.items[0].id, "image-2");
});

test("refresh positions the download button for the current media candidate", () => {
  const env = loadContentScript();
  env.detectorCandidates = [
    { id: "image-1", type: "image", url: "https://example.com/first.jpg", inViewport: true, viewportArea: 30000 },
    { id: "image-2", type: "image", url: "https://example.com/second.jpg", inViewport: true, viewportArea: 240000 }
  ];

  env.timers[0].fn();

  assert.equal(env.createdButton.positionedFor, "image-2");
});

test("refresh hides the page overlay on profile gallery pages without an active post", () => {
  const env = loadContentScript();
  env.hasActiveMediaContext = false;
  env.detectorCandidates = [
    { id: "image-1", type: "image", url: "https://example.com/gallery.jpg", inViewport: true, viewportArea: 120000 }
  ];

  env.timers[0].fn();

  assert.equal(env.createdButton.hidden, true);
});

test("GET_MEDIA is the only handled message type", async () => {
  const { listeners } = loadContentScript();

  const getMediaResult = await listeners[0]({ type: "GET_MEDIA" });
  const downloadMediaResult = listeners[0]({ type: "DOWNLOAD_MEDIA" });

  assert.equal(Array.isArray(getMediaResult.items), true);
  assert.equal(getMediaResult.items.length, 0);
  assert.equal(downloadMediaResult, undefined);
});
