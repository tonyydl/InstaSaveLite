# Task 5 Report

- Implemented `src/background/service-worker.js` with background download handling for `INSTASAVELITE_DOWNLOAD_MEDIA`.
- The worker now initializes default settings on install, reads `askWhereToSave` from storage, downloads each requested item, and returns `INSTASAVELITE_DOWNLOAD_COMPLETE` or `INSTASAVELITE_DOWNLOAD_FAILED`.
- Verification passed:
  - `node --check src/background/service-worker.js`
  - `node test/run-all.js`

## Fix

- Command: `node --check src/background/service-worker.js`
  - Result: passed with exit code 0.
- Command: `node test/run-all.js`
  - Result: passed with 15 tests, 0 failures.
