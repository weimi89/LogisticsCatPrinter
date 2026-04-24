#!/usr/bin/env bash
set -euo pipefail

# 在 Ubuntu 20.04 amd64 容器內建構 LogisticsCatPrinter,產出 .deb + .AppImage
# 用法: scripts/build-linux.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

IMAGE="gkconfig-ui-linux-builder:ubuntu20"
OUT_DIR="$ROOT/dist/linux-x64"

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

echo "==> Bundling inside container (x86_64 / ubuntu 20.04)"
docker run --rm \
  --platform linux/amd64 \
  -v "$ROOT":/work \
  -w /work \
  "$IMAGE"

mkdir -p "$OUT_DIR"
cp src-tauri/target/release/bundle/deb/*.deb "$OUT_DIR/" 2>/dev/null || true
cp src-tauri/target/release/bundle/appimage/*.AppImage "$OUT_DIR/" 2>/dev/null || true

if ! ls "$OUT_DIR"/*.deb "$OUT_DIR"/*.AppImage >/dev/null 2>&1; then
  echo "建構完成但找不到 .deb / .AppImage 產物" >&2
  exit 1
fi

echo ""
echo "==> Done"
ls -lh "$OUT_DIR/"
echo ""
echo "安裝:"
echo "  sudo apt install ./<檔名>.deb          # 系統安裝"
echo "  chmod +x <檔名>.AppImage && ./<...>   # 免安裝執行"
