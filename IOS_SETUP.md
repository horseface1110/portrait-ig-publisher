# iOS 上機設定

Tauri 的 iOS target 只能在 macOS 建立與編譯。

## 1. 初始化

```bash
npm install
npm run ios:init
```

## 2. 鎖定直向

開啟產生的 Xcode 專案，在 App target 的 **General → Deployment Info → Device Orientation**：

- 保留 **Portrait**
- 取消 **Landscape Left**
- 取消 **Landscape Right**
- 若不需要倒置，也取消 **Upside Down**

這會更新產生專案內的 `UISupportedInterfaceOrientations`。

## 3. 簽名

在 **Signing & Capabilities**：

- 選擇 Apple Developer Team
- 確認 Bundle Identifier 唯一，例如 `com.yourname.igpublisher`
- 開啟 Automatically manage signing

## 4. 相簿權限

Instagram 的網頁檔案選擇器通常由系統處理。若 Xcode 或 App Store 驗證要求用途說明，請在 target 的 Info 設定加入：

- `Privacy - Photo Library Usage Description`
- 建議文字：`選取要發佈到 Instagram 的照片`

## 5. 上機

```bash
npm run ios:dev
```

首次登入可能觸發 Instagram 的新裝置驗證，這是正常現象。

