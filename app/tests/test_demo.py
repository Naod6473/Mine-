"""Mode démo : isolation par visiteur, quotas, refus."""

from __future__ import annotations

import copy
import json
from unittest.mock import AsyncMock, MagicMock

import pytest
from aiohttp import web

import demo
import main


class FakeQueue:
    def __init__(self, cfg, notifier):
        self.config = cfg
        self.notifier = notifier
        self.queue = {}
        self.pending = {}
        self.done = {}
        self.added = []
        self.closed = False

    async def initialize(self):
        pass

    async def add(self, url, options):
        self.added.append((url, options))
        return {'status': 'ok'}

    async def retry(self, id):
        return {'status': 'ok'}

    async def cancel(self, ids):
        return {'status': 'ok', 'ids': ids}

    async def clear(self, ids, delete_files=False):
        return {'status': 'ok'}

    def cancel_add(self):
        pass

    def get(self):
        return ([], [])

    def close(self):
        self.closed = True


def _settings(**env):
    base = {'DEMO_MODE': 'true'}
    base.update(env)
    return demo.DemoSettings(base)


@pytest.fixture
def demo_mode(monkeypatch, tmp_path):
    cfg = copy.copy(main.config)
    cfg.DOWNLOAD_DIR = str(tmp_path)
    cfg.YTDL_OPTIONS = {'cookiefile': '/secret/cookies.txt', 'ratelimit': 1}
    settings = _settings()
    manager = demo.DemoManager(cfg, settings, FakeQueue, main.Notifier)
    monkeypatch.setattr(main, 'demo_manager', manager)
    monkeypatch.setattr(main, 'DEMO', settings)
    return manager


def _req(body=None, token='A' * 32, ip='1.2.3.4', path='/add'):
    req = MagicMock(spec=web.Request)
    req.json = AsyncMock(return_value=body)
    req.cookies = {demo.COOKIE: token} if token else {}
    req.headers = {'CF-Connecting-IP': ip}
    req.remote = '127.0.0.1'
    req.path = path
    return req


def _body(**kw):
    b = {'url': 'https://example.com/watch?v=1', 'download_type': 'video', 'codec': 'auto',
         'format': 'any', 'quality': 'best'}
    b.update(kw)
    return b


def test_settings_defaults():
    s = _settings()
    assert s.enabled and s.per_hour == 5 and s.max_minutes == 15
    assert s.public()['turnstile_sitekey'] == ''
    s = _settings(DEMO_TURNSTILE_SITEKEY='site', DEMO_TURNSTILE_SECRET='secret')
    assert s.public()['turnstile_sitekey'] == 'site'
    assert 'secret' not in json.dumps(s.public())
    assert not demo.DemoSettings({}).enabled


def test_rate_limiter_window():
    now = [0.0]
    rl = demo.RateLimiter(2, clock=lambda: now[0])
    rl.hit('k'); rl.hit('k')
    assert rl.remaining('k') == 0 and rl.wait_minutes('k') == 61
    now[0] = 3601
    assert rl.remaining('k') == 2 and rl.wait_minutes('k') == 0


def test_entry_check():
    check = demo.entry_check(_settings())
    assert check({'duration': 600}, 'video') is None
    assert check({'duration': None}, 'video') is None
    assert '15 minutes' in check({'duration': 901}, 'video')
    assert 'playlist' in check({}, 'playlist')
    assert 'playlist' in check({}, 'channel')
    assert 'directs' in check({'is_live': True}, 'video')


def test_token_helpers():
    t = demo.new_token()
    assert demo.valid_token(t)
    assert not demo.valid_token('../etc')
    assert demo.token_from_cookie_header(f'a=b; {demo.COOKIE}={t}') == t
    assert demo.token_from_cookie_header(f'{demo.COOKIE}=nope') is None
    assert demo.token_from_cookie_header(None) is None


def test_demo_config_isolates_and_strips_cookies(tmp_path):
    base = copy.copy(main.config)
    base.YTDL_OPTIONS = {'cookiefile': '/x', 'ratelimit': 5}
    cfg = demo.demo_config(base, str(tmp_path / 'v'), _settings())
    assert cfg.DOWNLOAD_DIR.startswith(str(tmp_path / 'v'))
    assert cfg.STATE_DIR != cfg.DOWNLOAD_DIR
    assert 'cookiefile' not in cfg.YTDL_OPTIONS and cfg.YTDL_OPTIONS['noplaylist'] is True
    assert cfg.YTDL_OPTIONS['ratelimit'] == 5
    assert cfg.CUSTOM_DIRS is False and cfg.YTDL_OPTIONS_PRESETS == {}
    assert base.YTDL_OPTIONS == {'cookiefile': '/x', 'ratelimit': 5}


async def test_visitors_get_separate_queues(demo_mode):
    await main.add(_req(_body(), token='A' * 32))
    await main.add(_req(_body(), token='B' * 32, ip='5.6.7.8'))
    a = demo_mode.visitors['A' * 32].queue
    b = demo_mode.visitors['B' * 32].queue
    assert a is not b and len(a.added) == 1 and len(b.added) == 1
    assert a.notifier.room == 'A' * 32
    assert a.config.DOWNLOAD_DIR != b.config.DOWNLOAD_DIR
    assert 'cookiefile' not in a.config.YTDL_OPTIONS
    assert main.dqueue not in (a, b)


async def test_add_forces_safe_options(demo_mode):
    await main.add(_req(_body(folder='../../etc', playlist_item_limit=50, auto_start=False)))
    _, options = demo_mode.visitors['A' * 32].queue.added[0]
    assert options.folder is None and options.auto_start is True
    assert options.playlist_item_limit == 1 and options.ytdl_options_presets == ()


async def test_quota_per_ip(demo_mode):
    for i in range(5):
        r = await main.add(_req(_body(), token=chr(65 + i) * 32))
        assert r.status == 200
    r = await main.add(_req(_body(), token='Z' * 32))
    assert r.status == 429
    assert json.loads(r.text)['code'] == 'demo_quota'
    # Une autre adresse a encore droit à ses 5.
    r = await main.add(_req(_body(), token='Y' * 32, ip='9.9.9.9'))
    assert r.status == 200


async def test_quota_per_visitor_across_ips(demo_mode):
    for i in range(5):
        assert (await main.add(_req(_body(), ip=f'10.0.0.{i}'))).status == 200
    assert (await main.add(_req(_body(), ip='10.0.0.99'))).status == 429


async def test_one_download_at_a_time(demo_mode):
    await main.add(_req(_body()))
    demo_mode.visitors['A' * 32].queue.queue['x'] = object()
    r = await main.add(_req(_body()))
    assert r.status == 429


async def test_missing_cookie_is_refused(demo_mode):
    with pytest.raises(web.HTTPForbidden):
        await main.add(_req(_body(), token=None))


async def test_turnstile_required_then_remembered(demo_mode, monkeypatch):
    demo_mode.settings.turnstile_secret = 'secret'
    calls = []

    async def fake_verify(visitor, token, ip, factory):
        calls.append(token)
        if token == 'good':
            visitor.verified_until = 1e18
            return True
        return False

    monkeypatch.setattr(demo_mode, 'verify_turnstile', fake_verify)
    r = await main.add(_req(_body()))
    assert r.status == 403 and json.loads(r.text)['code'] == 'demo_turnstile'
    r = await main.add(_req(_body(turnstile='good')))
    assert r.status == 200
    r = await main.add(_req(_body()))
    assert r.status == 200
    assert calls == [None, 'good']


async def test_delete_only_touches_own_queue(demo_mode):
    await main.add(_req(_body(), token='A' * 32))
    r = await main.delete(_req({'ids': ['x'], 'where': 'queue'}, token='B' * 32))
    assert r.status == 200
    assert 'B' * 32 in demo_mode.visitors


@pytest.mark.parametrize('path,blocked', [
    ('/subscribe', True), ('/subscriptions', True), ('/subscriptions/delete', True),
    ('/upload-cookies', True), ('/delete-cookies', True), ('/browse', True),
    ('/download/A/x.mp4', True), ('/audio_download/x.mp3', True),
    ('/add', False), ('/take', False), ('/', False), ('/subscribers.png', False),
])
async def test_demo_guard(demo_mode, path, blocked):
    handler = AsyncMock(return_value=web.Response(text='ok'))
    r = await main.demo_guard(_req(path=path), handler)
    assert (r.status == 403) is blocked


async def test_evict_idle(demo_mode, tmp_path):
    await main.add(_req(_body()))
    v = demo_mode.visitors['A' * 32]
    v.last_seen = -1e9
    assert await demo_mode.evict_idle() == 1
    assert v.queue.closed and 'A' * 32 not in demo_mode.visitors


async def test_queue_entry_check_refuses_before_queueing(tmp_path):
    from unittest.mock import MagicMock as MM
    from download_options import DownloadOptions
    from ytdl import DownloadQueue
    cfg = MM()
    for k in ('STATE_DIR', 'DOWNLOAD_DIR', 'AUDIO_DOWNLOAD_DIR', 'TEMP_DIR'):
        setattr(cfg, k, str(tmp_path))
    cfg.MAX_CONCURRENT_DOWNLOADS = 1
    cfg.ALLOW_PRIVATE_ADDRESSES = False
    cfg.YTDL_OPTIONS = {}
    cfg.YTDL_OPTIONS_PRESETS = {}
    cfg.CUSTOM_DIRS = False
    cfg.CLEAR_COMPLETED_AFTER = 0
    cfg.OUTPUT_TEMPLATE = cfg.OUTPUT_TEMPLATE_CHAPTER = '%(title)s.%(ext)s'
    cfg.OUTPUT_TEMPLATE_PLAYLIST = cfg.OUTPUT_TEMPLATE_CHANNEL = ''
    dq = DownloadQueue(cfg, AsyncMock())
    dq.entry_check = demo.entry_check(_settings())
    long_video = {'_type': 'video', 'id': 'v', 'title': 'Long', 'duration': 3600,
                  'url': 'https://example.com/watch?v=long', 'webpage_url': 'https://example.com/watch?v=long'}
    r = await dq.add_entry(long_video, DownloadOptions(auto_start=False))
    assert r['status'] == 'error' and '15 minutes' in r['msg']
    assert not dq.pending.exists('https://example.com/watch?v=long')
    playlist = {'_type': 'playlist', 'id': 'p', 'title': 'P', 'entries': [long_video]}
    r = await dq.add_entry(playlist, DownloadOptions(auto_start=False))
    assert r['status'] == 'error' and 'playlist' in r['msg']
    short = dict(long_video, duration=60, url='https://example.com/watch?v=s', webpage_url='https://example.com/watch?v=s')
    r = await dq.add_entry(short, DownloadOptions(auto_start=False))
    assert r['status'] == 'ok'
