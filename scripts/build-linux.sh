#!/usr/bin/env bash
set -euo pipefail

# 在 Ubuntu 22.04 amd64 容器內建構 gkconfig-ui,輸出單一可執行檔到 dist/linux-x64/
# 用法: scripts/build-linux.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

IMAGE="gkconfig-ui-linux-builder:ubuntu22"
OUT_DIR="$ROOT/dist/linux-x64"
TARGET_BIN="src-tauri/target/x86_64-unknown-linux-gnu/release/gkconfig-ui"

if ! command -v docker >/dev/null 2>&1; then
  echo "找不到 docker,請先安裝 Docker Desktop" >&2
  exit 1
fi

echo "==> Building builder image ($IMAGE)"
docker build \
  --platform linux/amd64 \
  -f docker/linux-build.Dockerfile \
  -t "$IMAGE" \
  .

echo "==> Compiling inside container (x86_64-unknown-linux-gnu)"
docker run --rm \
  --platform linux/amd64 \
  -v "$ROOT":/work \
  -w /work \
  "$IMAGE"

if [[ ! -f "$TARGET_BIN" ]]; then
  echo "建構完成但找不到產物: $TARGET_BIN" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
cp "$TARGET_BIN" "$OUT_DIR/LogisticsCatPrinter-linux-x64"
chmod +x "$OUT_DIR/LogisticsCatPrinter-linux-x64"

echo ""
echo "==> Done"
echo "產物: $OUT_DIR/LogisticsCatPrinter-linux-x64"
file "$OUT_DIR/LogisticsCatPrinter-linux-x64" || true
ls -lh "$OUT_DIR/LogisticsCatPrinter-linux-x64"
echo ""
echo "目標機 Ubuntu 22.04 amd64 需安裝 runtime 依賴:"
echo "  sudo apt-get install -y libwebkit2gtk-4.1-0 libgtk-3-0 libayatana-appindicator3-1 librsvg2-2"
