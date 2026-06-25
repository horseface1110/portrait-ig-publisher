# IG 發文助手

目前建議使用不需 Apple Developer 年費的 PWA 版本。把專案推到 GitHub 後，
GitHub Pages 會發布 `web/`，接著可直接在 iPhone Safari 加入主畫面。

## PWA 功能

- 一次選擇最多 10 張照片並預覽順序
- 多行文案、自動保存、字數統計與一鍵複製
- 使用 iOS Web Share API 開啟系統分享選單
- 可安裝到 iPhone 主畫面並離線開啟
- 照片不會上傳到伺服器

## Safari 自動發文腳本

`web/ig-publisher.user.js` 會直接執行於 `instagram.com`，沿用 Safari 現有登入
狀態，自動選圖、前往下一步、填入保留換行的文案，並在使用者確認後按下分享。
在 iPhone 上可搭配免費的
[Userscripts](https://apps.apple.com/app/userscripts/id1463298887) Safari 擴充功能。

這個流程依賴 Instagram 網頁介面，Instagram 改版後可能需要更新語意選擇器。

### 本機預覽

```powershell
npm.cmd run pwa:dev
```

### GitHub Pages

推送到 `main` 後，`.github/workflows/pages.yml` 會自動部署。第一次需在 GitHub
repository 的 **Settings → Pages → Source** 選擇 **GitHub Actions**。

> PWA 受 iOS 沙盒限制，不能直接修改 instagram.com，也無法保證 Instagram
> 分享擴充功能會接收文字。最穩定的流程是先複製文案，再分享照片，最後到
> Instagram 貼上。

---

## 舊版 Tauri 實驗

一個針對 iPhone 直向操作設計的 Tauri 2 Instagram 包裝 App。

## 解決的問題

- 強制使用桌面版 Safari User-Agent，保留 Instagram 網頁版的多圖發文能力。
- 使用 980px 虛擬桌面寬度，不需把手機旋轉成橫向。
- 注入獨立的多行文案板，先編輯、保存，再套用到 Instagram 的說明文字欄位。
- 提供浮動工具列，可快速開啟發文、文案板、回首頁與重新整理。

## Windows 開發預覽

```powershell
npm.cmd install
npm.cmd run dev
```

Windows 預覽使用 WebView2，行為不會與 iOS 的 WKWebView 完全一致。

## 在 macOS 建立 iOS 專案

需要完整 Xcode、Rust iOS targets 與 CocoaPods：

```bash
rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim
brew install cocoapods
npm install
npm run ios:init
npm run ios:dev
```

執行 `ios:init` 後，依照 [IOS_SETUP.md](./IOS_SETUP.md) 鎖定直向並設定簽名。

## 使用方式

1. 登入 Instagram。
2. 點底部「發文」開啟 Instagram 的建立貼文流程。
3. 可直接選取多張照片。
4. 點「文案」，在文案板中輸入含換行的文字。
5. 到 Instagram 說明文字步驟後按「套用到 IG」。

> Instagram 網頁 DOM 會不定期變更。本專案使用多組語意選擇器尋找按鈕與文字欄位，但若 Instagram 改版，可能需要更新 `src-tauri/src/injection.js`。
