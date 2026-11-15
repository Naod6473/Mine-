"""Génère desktop/data/formats.json et sites.json pour l'app de bureau.

À relancer quand le catalogue des formats change ou pour rafraîchir la liste des sites :
    uv run python desktop/gen_data.py
"""
import json
import os
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'app'))
tmp = tempfile.mkdtemp()
os.environ.setdefault('DOWNLOAD_DIR', tmp)
os.environ.setdefault('STATE_DIR', tmp)
os.environ.setdefault('TEMP_DIR', tmp)

import format_catalog  # noqa: E402
import main  # noqa: E402

catalog = format_catalog.public_catalog()
# Le texte brut (.txt) est fabriqué par le serveur à partir du SRT : pas dans l'app de bureau.
for kind in catalog['download_type']['options']:
    if kind['id'] == 'captions':
        kind['format']['options'] = [f for f in kind['format']['options'] if f['id'] != 'txt']

out = os.path.join(ROOT, 'desktop', 'data')
os.makedirs(out, exist_ok=True)
with open(os.path.join(out, 'formats.json'), 'w', encoding='utf-8') as f:
    json.dump(catalog, f, ensure_ascii=False, separators=(',', ':'))
with open(os.path.join(out, 'sites.json'), 'w', encoding='utf-8') as f:
    json.dump(main.supported_sites(), f, ensure_ascii=False, separators=(',', ':'))
print('formats.json et sites.json écrits dans', out)
