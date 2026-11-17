"""Mode démo : une instance publique de Mine!?, isolée par visiteur.

Activé par DEMO_MODE=true. Chaque visiteur reçoit un cookie aléatoire
(``mine_demo``) qui lui donne sa propre file de téléchargements, ses propres
dossiers et ses propres événements Socket.IO : il ne voit et ne touche que ce
qu'il a lancé lui-même. Les abonnements, l'envoi de cookies, les playlists,
le choix de dossier et les préréglages du serveur sont coupés.

Limites (réglables) :
- DEMO_DOWNLOADS_PER_HOUR (5) téléchargements par heure, par adresse IP et par visiteur ;
- DEMO_MAX_DURATION_MINUTES (15) minutes de vidéo au maximum, pas de direct ;
- DEMO_MAX_FILESIZE_MB (2048) Mo par fichier ;
- un seul téléchargement à la fois par visiteur ;
- vérification Turnstile (Cloudflare) si DEMO_TURNSTILE_SECRET est renseigné,
  valable DEMO_TURNSTILE_VALID_MINUTES (60) minutes pour un visiteur.

Ces limites n'existent que dans la démo : une installation normale n'en a aucune.
"""

from __future__ import annotations

import asyncio
import copy
import logging
import os
import re
import secrets
import shutil
import time
from collections import deque
from http.cookies import SimpleCookie
from typing import Callable, Optional

log = logging.getLogger('demo')

COOKIE = 'mine_demo'
_TOKEN_RE = re.compile(r'^[A-Za-z0-9_-]{32}$')
_TURNSTILE_VERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
_TRUE = ('true', 'True', 'on', '1')


def _env_int(name: str, default: int, minimum: int = 0) -> int:
    raw = os.environ.get(name, '').strip()
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        log.error('%s doit être un nombre entier, valeur par défaut %s utilisée', name, default)
        return default
    return max(minimum, value)


class DemoSettings:
    def __init__(self, environ=os.environ):
        self.enabled = environ.get('DEMO_MODE', 'false') in _TRUE
        self.per_hour = _env_int('DEMO_DOWNLOADS_PER_HOUR', 5, 1)
        self.max_minutes = _env_int('DEMO_MAX_DURATION_MINUTES', 15, 1)
        self.max_filesize_mb = _env_int('DEMO_MAX_FILESIZE_MB', 2048, 1)
        self.turnstile_sitekey = environ.get('DEMO_TURNSTILE_SITEKEY', '').strip()
        self.turnstile_secret = environ.get('DEMO_TURNSTILE_SECRET', '').strip()
        self.turnstile_valid = _env_int('DEMO_TURNSTILE_VALID_MINUTES', 60, 1) * 60
        self.idle_minutes = _env_int('DEMO_IDLE_MINUTES', 120, 5)
        self.install_url = environ.get('DEMO_INSTALL_URL', 'https://naod6473.github.io/Mine-/').strip()

    def public(self) -> dict:
        """Ce que l'interface a besoin de savoir (rien de secret)."""
        return {
            'per_hour': self.per_hour,
            'max_minutes': self.max_minutes,
            'turnstile_sitekey': self.turnstile_sitekey if self.turnstile_secret else '',
            'install_url': self.install_url,
        }


def valid_token(token: Optional[str]) -> bool:
    return bool(token) and bool(_TOKEN_RE.match(token))


def new_token() -> str:
    return secrets.token_urlsafe(24)  # 32 caractères


def token_from_cookie_header(header: Optional[str]) -> Optional[str]:
    if not header:
        return None
    try:
        jar = SimpleCookie()
        jar.load(header)
    except Exception:
        return None
    morsel = jar.get(COOKIE)
    token = morsel.value if morsel else None
    return token if valid_token(token) else None


def client_ip(headers, remote: Optional[str]) -> str:
    """L'adresse du visiteur. Derrière Cloudflare Tunnel, toutes les requêtes
    arrivent de cloudflared : la vraie adresse est dans CF-Connecting-IP."""
    ip = (headers.get('CF-Connecting-IP') or '').strip()
    if not ip:
        forwarded = headers.get('X-Forwarded-For') or ''
        ip = forwarded.split(',')[0].strip()
    return ip or (remote or 'inconnue')


class RateLimiter:
    """N événements par fenêtre glissante d'une heure, par clé."""

    def __init__(self, per_hour: int, window: float = 3600.0, clock: Callable[[], float] = time.monotonic):
        self.per_hour = per_hour
        self.window = window
        self.clock = clock
        self._hits: dict[str, deque] = {}

    def _prune(self, key: str) -> deque:
        hits = self._hits.setdefault(key, deque())
        limit = self.clock() - self.window
        while hits and hits[0] <= limit:
            hits.popleft()
        return hits

    def remaining(self, key: str) -> int:
        return max(0, self.per_hour - len(self._prune(key)))

    def wait_minutes(self, key: str) -> int:
        hits = self._prune(key)
        if len(hits) < self.per_hour:
            return 0
        return max(1, int((hits[0] + self.window - self.clock()) // 60) + 1)

    def hit(self, key: str) -> None:
        self._prune(key).append(self.clock())

    def forget_idle(self) -> None:
        for key in list(self._hits):
            if not self._prune(key):
                del self._hits[key]


def entry_check(settings: DemoSettings) -> Callable[[dict, str], Optional[str]]:
    """Refuse ce que la démo ne prend pas : playlists, chaînes, directs, vidéos trop longues."""
    max_seconds = settings.max_minutes * 60

    def check(entry: dict, etype: str) -> Optional[str]:
        if etype in ('playlist', 'channel', 'multi_video'):
            return "La démo ne prend qu'une vidéo à la fois, pas de playlist ni de chaîne. Installe Mine!? chez toi pour ça."
        if entry.get('is_live') or entry.get('live_status') in ('is_live', 'is_upcoming', 'post_live'):
            return "La démo ne prend pas les directs."
        duration = entry.get('duration')
        if isinstance(duration, (int, float)) and duration > max_seconds:
            return f"Dans la démo, les vidéos font {settings.max_minutes} minutes maximum. Chez toi, Mine!? n'a pas de limite."
        return None

    return check


def demo_config(base, root: str, settings: DemoSettings):
    """Une copie des réglages, rangée dans le dossier du visiteur, sans rien de partagé."""
    cfg = copy.copy(base)
    files = os.path.join(root, 'files')
    state = os.path.join(root, 'state')
    os.makedirs(files, exist_ok=True)
    os.makedirs(state, exist_ok=True)
    cfg.DOWNLOAD_DIR = files
    cfg.AUDIO_DOWNLOAD_DIR = files
    cfg.TEMP_DIR = files
    cfg.STATE_DIR = state
    cfg.CUSTOM_DIRS = False
    cfg.CREATE_CUSTOM_DIRS = False
    cfg.DEFAULT_FOLDER = ''
    cfg.MAX_CONCURRENT_DOWNLOADS = 1
    cfg.ALLOW_YTDL_OPTIONS_OVERRIDES = False
    cfg.ALLOW_PRIVATE_ADDRESSES = False
    cfg.YTDL_OPTIONS_PRESETS = {}
    cfg.SEND_TO_BROWSER = True
    # Un fichier jamais récupéré disparaît au bout d'une heure.
    cfg.CLEAR_COMPLETED_AFTER = 3600
    opts = {k: v for k, v in dict(base.YTDL_OPTIONS).items() if k not in ('cookiefile', 'cookiesfrombrowser')}
    opts['noplaylist'] = True
    opts['max_filesize'] = settings.max_filesize_mb * 1024 * 1024
    cfg.YTDL_OPTIONS = opts
    return cfg


class Visitor:
    def __init__(self, token: str, queue):
        self.token = token
        self.queue = queue
        self.last_seen = time.monotonic()
        self.verified_until = 0.0
        self.adding = False

    def touch(self):
        self.last_seen = time.monotonic()

    def busy(self) -> bool:
        return (self.adding or any(True for _ in self.queue.queue.items())
                or any(True for _ in self.queue.pending.items()))


class DemoManager:
    """Une file de téléchargements par visiteur, créée à la demande et oubliée après inactivité."""

    def __init__(self, base_config, settings: DemoSettings, queue_factory, notifier_factory):
        self.base = base_config
        self.settings = settings
        self.queue_factory = queue_factory
        self.notifier_factory = notifier_factory
        self.root = os.path.join(base_config.DOWNLOAD_DIR, '.demo')
        self.visitors: dict[str, Visitor] = {}
        self.by_ip = RateLimiter(settings.per_hour)
        self.by_visitor = RateLimiter(settings.per_hour)
        # Le nombre total de téléchargements en même temps reste celui du serveur.
        self.semaphore = asyncio.Semaphore(base_config.MAX_CONCURRENT_DOWNLOADS)
        self.check = entry_check(settings)
        self._lock = asyncio.Lock()

    def wipe(self):
        """Au démarrage : rien d'une session précédente ne reste."""
        shutil.rmtree(self.root, ignore_errors=True)
        os.makedirs(self.root, exist_ok=True)

    def peek(self, token: Optional[str]) -> Optional[Visitor]:
        v = self.visitors.get(token) if token else None
        if v:
            v.touch()
        return v

    async def visitor(self, token: str) -> Visitor:
        async with self._lock:
            v = self.visitors.get(token)
            if v is None:
                cfg = demo_config(self.base, os.path.join(self.root, token), self.settings)
                queue = self.queue_factory(cfg, self.notifier_factory(token))
                queue.semaphore = self.semaphore
                queue.entry_check = self.check
                await queue.initialize()
                v = Visitor(token, queue)
                self.visitors[token] = v
            v.touch()
            return v

    def quota_refusal(self, visitor: Visitor, ip: str) -> Optional[str]:
        if visitor.busy():
            return "Un téléchargement à la fois dans la démo : attends que le premier soit fini."
        wait = max(self.by_ip.wait_minutes(ip), self.by_visitor.wait_minutes(visitor.token))
        if wait:
            return (f"Dans la démo, c'est {self.settings.per_hour} téléchargements par heure. "
                    f"Réessaie dans {wait} min, ou installe Mine!? chez toi : là, aucune limite.")
        return None

    def count(self, visitor: Visitor, ip: str) -> None:
        self.by_ip.hit(ip)
        self.by_visitor.hit(visitor.token)

    def needs_turnstile(self, visitor: Visitor) -> bool:
        return bool(self.settings.turnstile_secret) and time.monotonic() >= visitor.verified_until

    async def verify_turnstile(self, visitor: Visitor, token: Optional[str], ip: str, session_factory) -> bool:
        if not token or not isinstance(token, str) or len(token) > 2048:
            return False
        try:
            async with session_factory() as session:
                async with session.post(_TURNSTILE_VERIFY, data={
                    'secret': self.settings.turnstile_secret, 'response': token, 'remoteip': ip,
                }, timeout=10) as r:
                    result = await r.json(content_type=None)
        except Exception as exc:
            log.warning('Vérification Turnstile impossible : %s', exc)
            return False
        if result.get('success'):
            visitor.verified_until = time.monotonic() + self.settings.turnstile_valid
            return True
        log.info('Turnstile refusé : %s', result.get('error-codes'))
        return False

    async def evict_idle(self) -> int:
        """Ferme les files des visiteurs partis depuis longtemps et efface leurs dossiers."""
        limit = time.monotonic() - self.settings.idle_minutes * 60
        gone = 0
        async with self._lock:
            for token, v in list(self.visitors.items()):
                if v.last_seen < limit and not v.busy():
                    del self.visitors[token]
                    try:
                        v.queue.close()
                        task = getattr(v.queue, '_live_monitor_task', None)
                        if task is not None:
                            task.cancel()
                    except Exception:
                        log.exception('Fermeture de la file du visiteur impossible')
                    shutil.rmtree(os.path.join(self.root, token), ignore_errors=True)
                    gone += 1
        self.by_ip.forget_idle()
        self.by_visitor.forget_idle()
        return gone

    async def janitor(self):
        while True:
            await asyncio.sleep(600)
            try:
                gone = await self.evict_idle()
                if gone:
                    log.info('Démo : %s visiteur(s) inactif(s) oublié(s)', gone)
            except Exception:
                log.exception('Nettoyage de la démo en échec')

    def close(self):
        for v in self.visitors.values():
            try:
                v.queue.close()
            except Exception:
                pass
