(function initMedia(globalScope) {
  const root = globalScope.InstaSaveLite || (globalScope.InstaSaveLite = {});
  const constants = root.constants;

  function isAllowedMediaHost(hostname) {
    return constants.INSTAGRAM_HOST_PATTERN.test(hostname) || constants.CDN_HOST_PATTERN.test(hostname);
  }

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
      if (parsed.protocol !== "https:") {
        return null;
      }
      if (!isAllowedMediaHost(parsed.hostname)) {
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
