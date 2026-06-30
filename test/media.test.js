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
