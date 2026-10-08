"""Restore the [← 回高性价比总目录](/docs/高性价比) back-link
on each chapter in docs/高性价比/.

- Link target uses a leading '/' but no '#' so docsify's hash router
  emits the correct href.
- Only adds the back-link when a file has none. Files that already
  have a back-link (any recognised form, even legacy) are left
  untouched so original line-ending style is preserved.
- Strips a stray UTF-8 BOM that some file tools add.
- Idempotent: re-runs are no-ops.
- UTF-8 (no BOM) on output.
"""

import re
from pathlib import Path

ROOT = Path(r"C:\Users\42692\WorkBuddy\Claw\knowledge-base")
CHAPTERS_DIR = ROOT / "docs" / "高性价比"
BACK_LINK = "[← 回高性价比总目录](/docs/高性价比)"

# Match any back-link form (with or without '#' prefix) as a single
# logical line, allowing leading/trailing whitespace.
BACK_LINK_LINE = re.compile(
    r"^\s*\[←\s*回高性价比总目录\]\([#/]?docs/高性价比\)\s*$",
    re.MULTILINE,
)


def has_back_link(text: str) -> bool:
    for line in text.splitlines():
        if line.strip() == "":
            continue
        return bool(BACK_LINK_LINE.match(line))
    return False


added, skipped, total = 0, 0, 0
for path in sorted(CHAPTERS_DIR.glob("*.md")):
    total += 1
    raw = path.read_bytes()
    if raw.startswith(b"\xef\xbb\xbf"):
        path.write_bytes(raw[3:])
        raw = raw[3:]
    text = raw.decode("utf-8")

    if has_back_link(text):
        skipped += 1
        continue

    # No back-link: prepend one. Use the dominant line ending for the
    # separator (LF for LF-only files, CRLF for files that contain
    # CRLF), but always keep the rest of the body byte-for-byte.
    sep = "\r\n" if "\r\n" in text else "\n"
    new_text = BACK_LINK + sep + sep + text
    path.write_text(new_text, encoding="utf-8")
    added += 1

print(f"总计 {total} 个文件，新增 {added} 个，已存在 {skipped} 个")
