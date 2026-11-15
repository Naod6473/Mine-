from main import supported_sites


def test_supported_sites_lists_youtube_once_with_its_kinds():
    sites = supported_sites()
    yt = [s for s in sites if s['name'].lower() == 'youtube']
    assert len(yt) == 1
    assert 'playlist' in yt[0]['kinds']
    assert not any(s['name'].lower() == 'generic' for s in sites)
    assert len(sites) > 500
