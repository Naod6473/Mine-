# Étape 1 : construction de l'interface (Svelte + Vite). Seul ui/dist est gardé.
# Image Node épinglée par empreinte pour des constructions arm64 reproductibles.
FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS builder

WORKDIR /mine
COPY ui/package.json ui/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY ui ./
RUN npm run build


# Étape 2 : le serveur Python (aiohttp + yt-dlp + ffmpeg).
FROM python:3.14-slim

WORKDIR /app

COPY pyproject.toml uv.lock docker-entrypoint.sh ./

# Fins de ligne Windows retirées du script d'entrée, puis dépendances système
RUN sed -i 's/\r$//g' docker-entrypoint.sh && \
    chmod +x docker-entrypoint.sh && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
      ca-certificates \
      xz-utils \
      unzip \
      aria2 \
      coreutils \
      gosu \
      curl \
      tini \
      build-essential && \
    curl -LsSf https://astral.sh/uv/install.sh | UV_INSTALL_DIR=/usr/local/bin sh && \
    UV_PROJECT_ENVIRONMENT=/usr/local uv sync --frozen --no-dev --compile-bytecode && \
    uv cache clean && \
    rm -f /usr/local/bin/uv /usr/local/bin/uvx /usr/local/bin/uvw && \
    apt-get purge -y --auto-remove build-essential && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir /.cache && chmod 777 /.cache

ARG TARGETARCH

# ffmpeg is a static build of upstream's 8.1 release branch rather than
# Debian's package: Debian stable stays a major version behind, and its 7.1
# cannot seek into YouTube's HLS formats, so clip downloads came out with no
# video (#1092). BtbN's builds are the ones yt-dlp's own FFmpeg-Builds fork;
# the release-branch build takes 8.1 point releases only. Bump FFMPEG_BRANCH
# deliberately, after testing clips and audio extraction on the new version.
ARG FFMPEG_BRANCH=8.1
RUN case "$TARGETARCH" in \
      amd64) FFMPEG_ARCH="linux64" ;; \
      arm64) FFMPEG_ARCH="linuxarm64" ;; \
      *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1 ;; \
    esac && \
    curl -fL "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n${FFMPEG_BRANCH}-latest-${FFMPEG_ARCH}-gpl-${FFMPEG_BRANCH}.tar.xz" \
      | tar -xJ -C /usr/local/bin --strip-components=2 --wildcards '*/bin/ffmpeg' '*/bin/ffprobe' && \
    ffmpeg -version | head -n 1

RUN BGUTIL_TAG="$(curl -Ls -o /dev/null -w '%{url_effective}' https://github.com/jim60105/bgutil-ytdlp-pot-provider-rs/releases/latest | sed 's#.*/tag/##')" && \
    case "$TARGETARCH" in \
      amd64) BGUTIL_ARCH="x86_64" ;; \
      arm64) BGUTIL_ARCH="aarch64" ;; \
      *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1 ;; \
    esac && \
    curl -L -o /usr/local/bin/bgutil-pot \
      "https://github.com/jim60105/bgutil-ytdlp-pot-provider-rs/releases/download/${BGUTIL_TAG}/bgutil-pot-linux-${BGUTIL_ARCH}" && \
    chmod +x /usr/local/bin/bgutil-pot && \
    PLUGIN_DIR="$(python3 -c 'import site; print(site.getsitepackages()[0])')" && \
    curl -L -o /tmp/bgutil-ytdlp-pot-provider-rs.zip \
      "https://github.com/jim60105/bgutil-ytdlp-pot-provider-rs/releases/download/${BGUTIL_TAG}/bgutil-ytdlp-pot-provider-rs.zip" && \
    unzip -q /tmp/bgutil-ytdlp-pot-provider-rs.zip -d "${PLUGIN_DIR}" && \
    rm /tmp/bgutil-ytdlp-pot-provider-rs.zip

COPY app ./app
COPY --from=builder /mine/dist ./ui/dist

ENV PUID=1000
ENV PGID=1000
ENV UMASK=022

ENV DOWNLOAD_DIR=/downloads
ENV STATE_DIR=/downloads/.mine
ENV TEMP_DIR=/downloads
ENV PORT=8081
LABEL org.opencontainers.image.title="Mine!?" \
      org.opencontainers.image.description="Coller un lien, appuyer sur Mine !, récupérer le fichier." \
      org.opencontainers.image.source="https://github.com/Naod6473/Mine-" \
      org.opencontainers.image.licenses="AGPL-3.0-only"
VOLUME /downloads
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD case "$HTTPS" in true|True|on|1) curl -fsSk "https://localhost:${PORT}/";; *) curl -fsS "http://localhost:${PORT}/";; esac || exit 1

# Version de l'image, fixée à la construction
ARG VERSION=dev
ENV MINE_VERSION=$VERSION

ENTRYPOINT ["/usr/bin/tini", "-g", "--", "./docker-entrypoint.sh"]
