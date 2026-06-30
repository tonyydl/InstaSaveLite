const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const constantsSource = fs.readFileSync(path.join(__dirname, "../src/shared/constants.js"), "utf8");
const mediaSource = fs.readFileSync(path.join(__dirname, "../src/shared/media.js"), "utf8");
const detectorSource = fs.readFileSync(path.join(__dirname, "../src/content/detector.js"), "utf8");

function createElement(tagName, attrs) {
  const element = {
    tagName: tagName.toUpperCase(),
    attrs: { ...(attrs || {}) },
    children: [],
    parent: null,
    naturalWidth: attrs && attrs.naturalWidth,
    naturalHeight: attrs && attrs.naturalHeight,
    videoWidth: attrs && attrs.videoWidth,
    videoHeight: attrs && attrs.videoHeight,
    currentSrc: attrs && attrs.currentSrc,
    src: attrs && attrs.src,
    getAttribute(name) {
      return this.attrs[name] || "";
    },
    getBoundingClientRect() {
      return this.attrs.rect || { top: 0, left: 0, right: 100, bottom: 100, width: 100, height: 100 };
    },
    querySelector(selector) {
      return querySelectorAll(this, selector)[0] || null;
    },
    querySelectorAll(selector) {
      return querySelectorAll(this, selector);
    },
    closest(selector) {
      let current = this;
      while (current) {
        if (matchesSelector(current, selector)) {
          return current;
        }
        current = current.parent;
      }
      return null;
    }
  };

  return element;
}

function append(parent, child) {
  child.parent = parent;
  parent.children.push(child);
  return child;
}

function walk(root) {
  return [root, ...root.children.flatMap(walk)];
}

function matchesSelector(element, selector) {
  if (selector === "img[src]") {
    return element.tagName === "IMG" && Boolean(element.attrs.src);
  }
  if (selector === "video") {
    return element.tagName === "VIDEO";
  }
  if (selector === "source[src]") {
    return element.tagName === "SOURCE" && Boolean(element.attrs.src);
  }
  if (selector === "picture source[srcset]") {
    return element.tagName === "SOURCE" && Boolean(element.attrs.srcset) && Boolean(element.closest("picture"));
  }
  if (selector === "picture") {
    return element.tagName === "PICTURE";
  }
  if (selector === "article") {
    return element.tagName === "ARTICLE";
  }
  if (selector === '[role="dialog"]') {
    return element.attrs.role === "dialog";
  }
  return false;
}

function querySelectorAll(root, selector) {
  return walk(root).filter((element) => matchesSelector(element, selector));
}

function loadDetector(document) {
  const context = {
    console,
    globalThis: null,
    document,
    location: { href: "https://www.instagram.com/example/" },
    innerWidth: 1200,
    innerHeight: 900,
    getComputedStyle() {
      return { visibility: "visible", display: "block" };
    },
    URL,
    Math,
    Date,
    Number,
    String,
    Boolean,
    Array,
    Object,
    RegExp
  };
  context.globalThis = context;

  vm.runInNewContext(constantsSource, context);
  vm.runInNewContext(mediaSource, context);
  vm.runInNewContext(detectorSource, context);

  return context.InstaSaveLite.detector;
}

test("collectMediaCandidates prefers media inside the open Instagram dialog", () => {
  const root = createElement("html");
  const backgroundArticle = append(root, createElement("article"));
  append(backgroundArticle, createElement("img", {
    src: "https://scontent.cdninstagram.com/background-first-post.jpg",
    naturalWidth: 1080,
    naturalHeight: 1080,
    rect: { top: 20, left: 20, right: 320, bottom: 320, width: 300, height: 300 }
  }));

  const dialog = append(root, createElement("div", {
    role: "dialog",
    rect: { top: 80, left: 200, right: 1000, bottom: 850, width: 800, height: 770 }
  }));
  append(dialog, createElement("img", {
    src: "https://scontent.cdninstagram.com/opened-post.jpg",
    naturalWidth: 1080,
    naturalHeight: 1350,
    rect: { top: 120, left: 260, right: 820, bottom: 820, width: 560, height: 700 }
  }));

  const document = {
    baseURI: "https://www.instagram.com/example/",
    documentElement: root,
    querySelectorAll(selector) {
      return querySelectorAll(root, selector);
    },
    querySelector(selector) {
      return querySelectorAll(root, selector)[0] || null;
    }
  };

  const detector = loadDetector(document);
  const candidates = detector.collectMediaCandidates(document);

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].url, "https://scontent.cdninstagram.com/opened-post.jpg");
});
