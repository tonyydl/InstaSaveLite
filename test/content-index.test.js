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
        sendMessage() {
          throw new Error("sendMessage should not be called in these tests");
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
        return [];
      }
    },
    overlay: {
      createDownloadButton() {
        return { hidden: false };
      }
    }
  };

  vm.runInNewContext(scriptSource, context, { filename: scriptPath });

  return { timers, clearedTimers, observers, listeners, document };
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
