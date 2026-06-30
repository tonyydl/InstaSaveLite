(function initDetector(globalScope) {
  const root = globalScope.InstaSaveLite || (globalScope.InstaSaveLite = {});
  const media = root.media;

  function isVisibleElement(element) {
    const rect = element.getBoundingClientRect();
    const style = globalScope.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  }

  function isInViewport(element, doc) {
    const rect = element.getBoundingClientRect();
    const width = globalScope.innerWidth || doc.documentElement.clientWidth;
    const height = globalScope.innerHeight || doc.documentElement.clientHeight;
    return rect.bottom > 0 && rect.right > 0 && rect.top < height && rect.left < width;
  }

  function candidateFromElement(element, type, url, index, doc) {
    const normalized = media.normalizeMediaUrl(url, doc.baseURI);
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
      inViewport: isInViewport(element, doc)
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
      const candidate = candidateFromElement(img, "image", url, index, doc);
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
        const candidate = candidateFromElement(img, "image", bestSrcset.url, images.length + index, doc);
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
      const candidate = candidateFromElement(video, "video", source, index, doc);
      if (candidate) {
        candidates.push(candidate);
      }
    });

    return candidates;
  }

  function collectMediaCandidates(documentRef) {
    const candidates = [
      ...collectVideoCandidates(documentRef),
      ...collectImageCandidates(documentRef)
    ].filter((candidate) => candidate.visible);

    return media.dedupeCandidates(candidates).map((candidate, index) => ({
      ...candidate,
      index: index + 1,
      filename: media.createFilename({ ...candidate, index: index + 1 })
    }));
  }

  root.detector = {
    collectMediaCandidates
  };
})(globalThis);
