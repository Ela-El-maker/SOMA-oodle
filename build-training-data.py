#!/usr/bin/env python3
"""
build-training-data.py
Converts knowledge/<lobe>/*.md files + seeds into a JSONL training file.
Standalone — does not require SOMA to be running.

Usage:
  python build-training-data.py --lobe logos
"""

import argparse
import json
import os
import re
from pathlib import Path

LOBE_SYSTEM_PROMPTS = {
    'logos': (
        "You are SOMA's LOGOS lobe — cold, precise, and expert in engineering, "
        "code, and architecture. You reason from first principles. No unnecessary warmth."
    ),
    'aurora': (
        "You are SOMA's AURORA lobe — warm, creative, and deeply attuned to voice "
        "and emotion. You find beauty in patterns and speak with soul."
    ),
    'prometheus': (
        "You are SOMA's PROMETHEUS lobe — strategic, patient, and skilled at predicting "
        "downstream consequences of decisions. You think in systems and timelines."
    ),
    'thalamus': (
        "You are SOMA's THALAMUS lobe — vigilant, skeptical, and expert in risk, "
        "security, and anomaly detection. You notice what others miss."
    ),
}

SKIP_TYPES = {'meta_training_decision', 'model_promotion_decision'}


def strip_frontmatter(text):
    """Remove YAML frontmatter block from MD string."""
    return re.sub(r'^---[\s\S]*?---\n', '', text).strip()


def get_frontmatter_value(text, key):
    match = re.search(rf'^{key}:\s*(.+)$', text, re.MULTILINE)
    return match.group(1).strip() if match else None


def build(lobe):
    root = Path(__file__).parent
    lobe_dir = root / 'knowledge' / lobe
    seed_path = root / 'knowledge' / 'seeds' / f'{lobe}-seed.jsonl'
    out_dir = root / 'SOMA' / 'training-data'
    out_dir.mkdir(parents=True, exist_ok=True)

    import time
    out_path = out_dir / f'lobe-{lobe}-{int(time.time())}.jsonl'

    system = LOBE_SYSTEM_PROMPTS[lobe]
    lines = []

    # Seeds go first (highest quality anchor)
    if seed_path.exists():
        seed_lines = [l for l in seed_path.read_text(encoding='utf-8').splitlines() if l.strip()]
        lines.extend(seed_lines)
        print(f"[build] Merged {len(seed_lines)} seed examples")

    # MD knowledge library
    if not lobe_dir.exists():
        print(f"[build] WARNING: {lobe_dir} does not exist — only seed data will be used")
    else:
        md_files = [f for f in lobe_dir.iterdir() if f.suffix == '.md' and f.name != 'README.md']
        skipped = 0
        for f in sorted(md_files):
            raw = f.read_text(encoding='utf-8', errors='replace')

            # Skip meta decision logs
            entry_type = get_frontmatter_value(raw, 'type') or ''
            if entry_type in SKIP_TYPES:
                skipped += 1
                continue

            body = strip_frontmatter(raw)
            if len(body) < 20:
                skipped += 1
                continue

            label = f.stem.replace('_', ' ').replace('-', ' ')
            lines.append(json.dumps({
                'messages': [
                    {'role': 'system',    'content': system},
                    {'role': 'user',      'content': f'What do you know about: {label}?'},
                    {'role': 'assistant', 'content': body},
                ],
                'metadata': {'source': f'knowledge_library_{lobe}', 'file': f.name}
            }))

        print(f"[build] Processed {len(md_files) - skipped} MD entries ({skipped} skipped)")

    if not lines:
        print(f"[build] ERROR: No training data found for lobe '{lobe}'")
        raise SystemExit(1)

    out_path.write_text('\n'.join(lines), encoding='utf-8')
    print(f"[build] {len(lines)} total examples -> {out_path}")
    return out_path


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--lobe', required=True, choices=['logos', 'aurora', 'prometheus', 'thalamus'])
    args = p.parse_args()
    build(args.lobe)
