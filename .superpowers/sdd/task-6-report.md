# Task 6 Report

- Added the real popup UI in `src/popup/popup.html`, `src/popup/popup.css`, and `src/popup/popup.js`.
- The popup now:
  - requests visible media from the active tab with `INSTASAVELITE_GET_MEDIA`
  - starts one-item and all-item downloads with `INSTASAVELITE_DOWNLOAD_MEDIA`
  - loads and saves the `askWhereToSave` setting through the shared storage helper
  - renders per-item rows with preview, metadata, and a save button
- Verification passed:
  - `node --check src/popup/popup.js`
  - `node test/run-all.js`

## Commit

- `88183a5` - `Add media download popup`

## Concerns

- None.
