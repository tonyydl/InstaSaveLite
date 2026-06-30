# Task 4 Report

Status: DONE

Commit:
- `95384ce` - `Add Instagram media detector`

Test summary:
- `node test/run-all.js` passed with 10/10 tests green
- `node --check src/content/detector.js` passed
- `node --check src/content/overlay-button.js` passed
- `node --check src/content/index.js` passed
- `git diff --check` passed

Concerns:
- None.

Notes:
- Added the `createFilename defaults unknown image URLs to jpg` test first; it passed immediately because the shared media helper already had the fallback behavior.
- Implemented `src/content/detector.js`, `src/content/overlay-button.js`, and `src/content/index.js` to expose `collectMediaCandidates`, create the fixed overlay download button, and answer `INSTASAVELITE_GET_MEDIA` / acknowledge `INSTASAVELITE_DOWNLOAD_MEDIA`.

Fix:
- Removed the `INSTASAVELITE_DOWNLOAD_MEDIA` response path from `src/content/index.js` so the content script only responds to `INSTASAVELITE_GET_MEDIA`.
- Filtered `collectMediaCandidates` in `src/content/detector.js` to keep only candidates that are both visible and in viewport before dedupe and sorting.

Commands:
- `node test/run-all.js` -> passed, 10/10 tests green.
- `node --check src/content/detector.js` -> passed.
- `node --check src/content/overlay-button.js` -> passed.
- `node --check src/content/index.js` -> passed.
