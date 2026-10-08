#!/usr/bin/env python3
"""Fix known UTF-8 mojibake literals in frontend source files.

Safe scope:
- scans only frontend source-like text files
- skips node_modules, build/dist, .git, coverage
- replaces only known deterministic UTF-8 mojibake sequences
- writes UTF-8

Run from the frontend repository root:
    python3 scripts/check-and-fix-utf8-mojibake.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {"node_modules", "build", "dist", ".git", "coverage", ".cache"}
TEXT_EXTENSIONS = {".js", ".jsx", ".ts", ".tsx", ".css", ".html", ".json", ".md"}

REPLACEMENTS = {
    "â€“": "–",
    "Â·": "·",
    "â€”": "—",
    "â†’": "→",
    "â†": "←",
    "â‰¥": "≥",
    "â‰¤": "≤",
    "â€¢": "•",
    "â€˜": "‘",
    "â€™": "’",
    "â€œ": "“",
    "â€": "”",
    "Ã—": "×",
    "Â©": "©",
}

changed_files = []
remaining = []

for path in ROOT.rglob("*"):
    if not path.is_file() or path.suffix.lower() not in TEXT_EXTENSIONS:
        continue
    if any(part in SKIP_DIRS for part in path.parts):
        continue

    try:
        original = path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        continue

    updated = original
    for broken, correct in REPLACEMENTS.items():
        updated = updated.replace(broken, correct)

    if updated != original:
        path.write_text(updated, encoding="utf-8", newline="\n")
        changed_files.append(path.relative_to(ROOT))

for path in ROOT.rglob("*"):
    if not path.is_file() or path.suffix.lower() not in TEXT_EXTENSIONS:
        continue
    if any(part in SKIP_DIRS for part in path.parts):
        continue
    try:
        content = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    for broken in REPLACEMENTS:
        if broken in content:
            remaining.append((path.relative_to(ROOT), broken))

print(f"Updated {len(changed_files)} file(s).")
for path in changed_files:
    print(f"  fixed: {path}")

if remaining:
    print("\nRemaining known mojibake sequences:")
    for path, token in remaining:
        print(f"  {path}: {token}")
    raise SystemExit(1)

print("No known mojibake sequences remain in frontend source files.")
