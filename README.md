# 物流貓標籤機設定 (LogisticsCatPrinter)

Tauri 2.x 桌面應用程式,用來編輯物流標籤機的 JSON 設定檔、管理格口列表,並一鍵執行 `c4000.sh` 重啟設備。

- 前端:純 HTML / CSS / JS(無框架,`src/`)
- 後端:Rust (`src-tauri/`),Tauri 2 + `tauri-plugin-dialog`
- 平台:macOS、Linux (Ubuntu 22.04+)

---

## 功能

- 透過原生檔案對話框選擇設定檔 JSON,自動記住上次路徑
- 編輯基本設定(7-11 格口數、API URL)
- 新增 / 刪除 / 編輯格口(代號、通道、USB 埠、尺寸、列印指令、起點座標、重試設定)
- 即時預覽原始 JSON
- 儲存回檔案(保留鍵順序,`serde_json` 的 `preserve_order` feature)
- 「重啟設備」按鈕執行設定檔目錄下的 `c4000.sh`

---

## 下載可執行檔

前往 [Releases](https://github.com/weimi89/LogisticsCatPrinter/releases) 下載對應平台的 binary。

Linux 目標機(Ubuntu 22.04 amd64)首次執行前需安裝 runtime 依賴:

```bash
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.1-0 \
  libgtk-3-0 \
  libayatana-appindicator3-1 \
  librsvg2-2
```

執行:

```bash
chmod +x LogisticsCatPrinter-linux-x64
./LogisticsCatPrinter-linux-x64
```

---

## 開發環境

### 前置需求

- Rust stable (`rustup`)
- Node 非必要(前端是純 static HTML)
- 系統依賴:
  - **macOS**:Xcode Command Line Tools
  - **Ubuntu 22.04+**:
    ```bash
    sudo apt-get install -y \
      build-essential pkg-config libssl-dev \
      libwebkit2gtk-4.1-dev libgtk-3-dev \
      libayatana-appindicator3-dev librsvg2-dev \
      libsoup-3.0-dev libjavascriptcoregtk-4.1-dev
    ```

### 本機開發執行

```bash
cd src-tauri
cargo tauri dev        # 需先 cargo install tauri-cli --version '^2'
# 或直接
cargo run
```

### 本機 Release 建構

```bash
cd src-tauri
cargo build --release
# 產物: src-tauri/target/release/gkconfig-ui (或 .exe)
```

---

## Linux 建構(兩種方式)

### A. GitHub Actions(推薦)

推 tag 即自動打包並建立 Release:

```bash
git tag -a v0.1.1 -m "release v0.1.1"
git push origin v0.1.1
```

Workflow 定義在 `.github/workflows/build-linux.yml`:
- `push` 到 `main` / `pull_request`:build + 上傳 artifact(保留 30 天)
- `push` tag `v*`:build + 自動附檔到 GitHub Release
- 環境:`ubuntu-22.04`,原生 amd64

### B. 本機 Docker(無網路 / 不走 CI 時)

```bash
./scripts/build-linux.sh
```

- Dockerfile:`docker/linux-build.Dockerfile`(Ubuntu 22.04 amd64 base)
- 產物:`dist/linux-x64/LogisticsCatPrinter-linux-x64`
- arm64 Mac 透過 qemu 模擬 amd64,首次約 10–20 分鐘

---

## 專案結構

```
LogisticsCatPrinter/
├── src/                          前端 (HTML/CSS/JS)
│   ├── index.html
│   ├── main.js
│   ├── styles.css
│   └── logo.png
├── src-tauri/                    Rust 後端
│   ├── src/
│   │   ├── main.rs
│   │   └── lib.rs                Tauri commands
│   ├── capabilities/default.json 權限設定
│   ├── icons/                    多平台應用圖示
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docker/
│   └── linux-build.Dockerfile    Docker 建構 image
├── scripts/
│   └── build-linux.sh            本機 Docker 建構一鍵腳本
└── .github/workflows/
    └── build-linux.yml           GitHub Actions CI
```

---

## Tauri Commands

定義於 `src-tauri/src/lib.rs`,前端透過 `window.__TAURI__.core.invoke()` 呼叫:

| Command | 功能 |
|---|---|
| `read_config(path)` | 讀取 JSON 設定檔 |
| `write_config(path, data)` | 寫入 JSON(pretty,保留鍵順序) |
| `restart_service(config_path)` | 執行設定檔目錄下的 `c4000.sh` |
| `get_last_path()` | 取得上次使用的設定檔路徑 |
| `set_last_path(path)` | 記住設定檔路徑(存於 app config dir) |

---

## 版本

v0.1.0 — 首個 Linux 可執行檔版本
