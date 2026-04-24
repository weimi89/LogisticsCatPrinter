FROM --platform=linux/amd64 ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Taipei \
    APPIMAGE_EXTRACT_AND_RUN=1 \
    RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates git wget file sudo tzdata \
    build-essential pkg-config \
    libssl-dev \
    libwebkit2gtk-4.0-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    patchelf \
    fuse libfuse2 \
    xdg-utils desktop-file-utils \
 && ln -fs /usr/share/zoneinfo/$TZ /etc/localtime \
 && echo $TZ > /etc/timezone \
 && rm -rf /var/lib/apt/lists/*

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
    | sh -s -- -y --default-toolchain stable --profile minimal

RUN cargo install tauri-cli --version '^1' --locked

WORKDIR /work

CMD ["bash", "-lc", "cd src-tauri && cargo tauri build --bundles deb,appimage"]
