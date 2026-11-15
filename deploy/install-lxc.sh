#!/usr/bin/env bash
# Mine!? : installation sur Proxmox VE en une commande.
#
# À lancer en root sur l'hôte Proxmox :
#   bash install-lxc.sh
# ou, pour changer les réglages :
#   CTID=150 DOWNLOADS=/mnt/data/mine STORAGE=local-zfs bash install-lxc.sh
#
# Le script crée un LXC Debian 13 non privilégié (nesting activé), monte le dossier
# des téléchargements depuis l'hôte, installe Docker et lance Mine!? sur le port 8081.

set -euo pipefail

CTID="${CTID:-$(pvesh get /cluster/nextid)}"
HOSTNAME="${HOSTNAME_CT:-mine}"
STORAGE="${STORAGE:-local-lvm}"            # stockage du disque du conteneur
TEMPLATE_STORAGE="${TEMPLATE_STORAGE:-local}"
DISK="${DISK:-8}"                          # Go
MEMORY="${MEMORY:-1024}"                   # Mo
CORES="${CORES:-1}"
BRIDGE="${BRIDGE:-vmbr0}"
IP="${IP:-dhcp}"                           # ou 192.168.1.50/24 (avec GATEWAY)
GATEWAY="${GATEWAY:-}"
DOWNLOADS="${DOWNLOADS:-/mnt/mine-downloads}"  # dossier de l'hôte où arrivent les fichiers
PORT="${PORT:-8081}"
IMAGE="${MINE_IMAGE:-ghcr.io/naod6473/mine:latest}"
REPO="${MINE_REPO:-https://github.com/Naod6473/Mine-.git}"

say()  { printf '\033[1;33m▸\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

command -v pct >/dev/null || fail "Ce script se lance sur l'hôte Proxmox VE (commande pct introuvable)."
[ "$(id -u)" -eq 0 ] || fail "Lance-le en root."
pct status "$CTID" >/dev/null 2>&1 && fail "Le conteneur $CTID existe déjà. Choisis un autre CTID=…"

say "Recherche du modèle Debian 13…"
pveam update >/dev/null
TEMPLATE="$(pveam available --section system | awk '/debian-13-standard/ {print $2}' | sort -V | tail -n1)"
[ -n "$TEMPLATE" ] || fail "Modèle debian-13-standard introuvable dans pveam."
if ! pveam list "$TEMPLATE_STORAGE" | grep -q "$TEMPLATE"; then
  say "Téléchargement de $TEMPLATE…"
  pveam download "$TEMPLATE_STORAGE" "$TEMPLATE" >/dev/null
fi

NET="name=eth0,bridge=$BRIDGE,ip=$IP"
[ -n "$GATEWAY" ] && NET="$NET,gw=$GATEWAY"

say "Création du conteneur $CTID ($HOSTNAME)…"
pct create "$CTID" "$TEMPLATE_STORAGE:vztmpl/$TEMPLATE" \
  --hostname "$HOSTNAME" --unprivileged 1 --features nesting=1,keyctl=1 \
  --cores "$CORES" --memory "$MEMORY" --swap 512 \
  --rootfs "$STORAGE:$DISK" --net0 "$NET" --onboot 1 \
  --description "Mine!? : coller un lien, appuyer sur Mine !" >/dev/null

say "Dossier des téléchargements : $DOWNLOADS"
mkdir -p "$DOWNLOADS"
# L'utilisateur 1000 du conteneur non privilégié correspond à 101000 sur l'hôte.
chown 101000:101000 "$DOWNLOADS"
pct set "$CTID" -mp0 "$DOWNLOADS,mp=/downloads"

say "Démarrage…"
pct start "$CTID"
for _ in $(seq 1 30); do
  pct exec "$CTID" -- sh -c 'getent hosts deb.debian.org >/dev/null 2>&1' && break
  sleep 2
done

say "Installation de Docker dans le conteneur (une à deux minutes)…"
pct exec "$CTID" -- bash -c '
  set -e
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq curl ca-certificates git >/dev/null
  curl -fsSL https://get.docker.com | sh >/dev/null
  systemctl enable --now docker >/dev/null
'

say "Mise en place de Mine!?…"
pct exec "$CTID" -- bash -c "mkdir -p /opt/mine && cat > /opt/mine/compose.yaml" <<EOF
services:
  mine:
    image: $IMAGE
    container_name: mine
    restart: unless-stopped
    ports:
      - "$PORT:8081"
    volumes:
      - /downloads:/downloads
    environment:
      PUID: "1000"
      PGID: "1000"
      TZ: "$(cat /etc/timezone 2>/dev/null || echo Europe/Paris)"
      MAX_CONCURRENT_DOWNLOADS: "3"
      CLEAR_COMPLETED_AFTER: "604800"
      YTDL_NIGHTLY_UPDATE_TIME: "04:00"
EOF

if ! pct exec "$CTID" -- bash -c "cd /opt/mine && docker compose pull -q"; then
  say "Image $IMAGE indisponible (paquet privé ?). Construction depuis le code source…"
  pct exec "$CTID" -- bash -c "
    set -e
    git clone --depth 1 '$REPO' /opt/mine/src
    docker build -t mine:local /opt/mine/src
    sed -i 's#image: .*#image: mine:local#' /opt/mine/compose.yaml
  "
fi
pct exec "$CTID" -- bash -c "cd /opt/mine && docker compose up -d"

CT_IP=""
for _ in $(seq 1 15); do
  CT_IP="$(pct exec "$CTID" -- hostname -I 2>/dev/null | awk '{print $1}')"
  [ -n "$CT_IP" ] && break
  sleep 2
done

printf '\n\033[1;33mMine !\033[0m Mine!? tourne dans le conteneur %s.\n' "$CTID"
printf '  Ouvre : http://%s:%s\n' "${CT_IP:-<ip-du-conteneur>}" "$PORT"
printf '  Fichiers : %s (sur l hôte)\n' "$DOWNLOADS"
printf '  Mise à jour : pct exec %s -- bash -c "cd /opt/mine && docker compose pull && docker compose up -d"\n' "$CTID"
