# InstaSaveLite

> 下載你已經能在瀏覽器中看到的 Instagram 圖片與影片。

[English](README.md) | **中文**

InstaSaveLite 是一個輕量的跨瀏覽器擴充功能，支援 Chrome、Edge 和
Firefox。它會在目前開啟的 Instagram 貼文或 Reel 媒體右下角顯示一個小
下載 icon，也提供 toolbar popup 讓你先檢查目前頁面偵測到的媒體，再選擇
下載。

這個擴充功能是為個人便利使用而設計。它不會繞過登入、私密帳號、付費內容、
已刪除內容、DRM、地區限制，或任何存取控制。

---

## 功能

- **貼文下載 icon** - 開啟貼文後，下載 icon 會出現在目前媒體的右下角。
- **支援多圖貼文** - 如果貼文有多張照片或影片，icon 會下載目前可見的那一
  張/支，而不是永遠下載第一個項目。
- **Popup 媒體清單** - toolbar popup 會列出目前 Instagram 頁面偵測到的媒
  體。
- **單項或批次下載** - 可以下載單一項目，也可以在 popup 使用
  **Download all**。
- **重複 URL 過濾** - 批次下載前會合併重複媒體 URL。
- **下載位置選項** - 可切換 **Ask where to save**，決定每次下載前是否讓瀏
  覽器詢問儲存位置。
- **跨瀏覽器 MV3 runtime** - 支援 Chrome/Edge 的 Manifest V3 service
  worker，也支援 Firefox MV3 background scripts。

## 不做的事

- 不做登入自動化。
- 不繞過私密帳號。
- 不繞過付費內容、DRM、已刪除內容或地區限制。
- 不做背景帳號爬取或大量批次爬蟲。
- 沒有後端伺服器、telemetry、analytics 或遠端 logging。

InstaSaveLite 只會處理 Instagram 已經暴露給目前頁面、而且你本來就能在瀏覽
器中看到的媒體 URL。

## 安裝

目前還沒有打包上架商店，開發階段請用 unpacked / temporary extension 的方式
載入。

### Chrome / Edge

1. 開啟 `chrome://extensions` 或 `edge://extensions`。
2. 啟用 **Developer mode**。
3. 點選 **Load unpacked**。
4. 選擇 `InstaSaveLite` 資料夾。
5. 開啟 Instagram，並重新整理已開啟的 Instagram 分頁。

### Firefox

需要 Firefox 121 或更新版本。

1. 開啟 `about:debugging#/runtime/this-firefox`。
2. 點選 **Load Temporary Add-on**。
3. 選擇 `InstaSaveLite/manifest.json`。
4. 開啟 Instagram，並重新整理已開啟的 Instagram 分頁。

## 使用方式

- 開啟 Instagram 貼文、Reel，或從個人頁九宮格點開某篇貼文。
- 貼文開啟後，點擊目前媒體右下角的圓形下載 icon。
- 多圖貼文請先切到想下載的照片或影片，再點下載 icon。
- 開啟 extension popup 可以查看偵測到的媒體，並下載單一項目。
- 在 popup 點 **Download all** 可以將所有偵測到的可見媒體加入下載。
- 切換 **Ask where to save** 可決定下載前是否讓瀏覽器詢問儲存位置。

在個人頁 gallery / 九宮格頁面，頁面上的下載 icon 會隱藏，直到你點開特定貼
文。Popup 仍可用來檢查目前偵測到的媒體。

## 隱私

- **沒有 InstaSaveLite 伺服器。** 下載由你的瀏覽器直接啟動。
- **沒有 analytics 或 telemetry。** 擴充功能不回報使用狀況。
- **只有本機設定。** `Ask where to save` 偏好儲存在瀏覽器 extension storage。
- **URL 範圍有限。** 下載限制在 `instagram.com`、`cdninstagram.com` 和
  `fbcdn.net` 的 HTTPS URL。

## 專案結構

```text
InstaSaveLite/
+- manifest.json
+- README.md
+- README.zh-TW.md
+- icons/
+- styles/
|  +- content.css
+- src/
|  +- vendor/
|  |  +- browser-polyfill.min.js
|  +- shared/
|  |  +- constants.js
|  |  +- media.js
|  |  +- storage.js
|  +- content/
|  |  +- detector.js
|  |  +- overlay-button.js
|  |  +- index.js
|  +- background/
|  |  +- background.js
|  |  +- service-worker.js
|  +- popup/
|     +- popup.html
|     +- popup.css
|     +- popup.js
+- test/
   +- run-all.js
```

## 測試

執行 Node-based test suite：

```bash
node test/run-all.js
```

常用 syntax check：

```bash
node --check src/content/detector.js
node --check src/background/background.js
node --check src/popup/popup.js
```

## 手動驗證

- Chrome/Edge：在 `chrome://extensions` 或 `edge://extensions` 啟用
  Developer mode 後載入資料夾。
- Firefox：從 `about:debugging#/runtime/this-firefox` 載入
  `manifest.json`。
- 開啟 Instagram 圖片貼文，確認下載 icon 出現在目前媒體上。
- 開啟多圖貼文，切換照片後確認 icon 會下載目前那一張。
- 開啟 Instagram Reel 或影片貼文，確認 DOM 有直接媒體 URL 時可以開始下載。
- 開啟 popup，確認偵測到的媒體會出現在清單中。
- 切換 **Ask where to save**，下載單一項目，確認瀏覽器會詢問儲存位置。
- 使用 **Download all**，確認重複媒體 URL 不會被下載兩次。
