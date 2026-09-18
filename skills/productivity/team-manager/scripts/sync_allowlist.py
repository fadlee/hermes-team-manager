#!/usr/bin/env python3
"""Sync company/members/*.md + company.md owner_whatsapp into config.yaml
platforms.whatsapp.allow_from (the list the Python gateway actually enforces
for DM intake — see _select_dm_allowlist in gateway/platforms/whatsapp_common.py,
where an `allow_from` key in config always wins over any env var).

Gap this closes: the Node WhatsApp bridge reads company/members/*.md live
(allowlist.js) and lets a new member's messages through at the transport
layer, but the Python gateway's DM intake gate only reads config allow_from
/ WHATSAPP_ALLOWED_USERS (config wins if both are set). A member added to
members/*.md is therefore silently dropped at the gateway with no error
until this sync runs. Run after adding/editing any member's `whatsapp:`
field, then `hermes -p <profile> gateway restart` to pick it up (allow_from
is read at adapter construction, not live).

Stdlib only. Usage: python3 sync_allowlist.py <profile_home_dir>
"""
import re
import sys
from pathlib import Path


def collect_numbers(home: Path) -> set[str]:
    numbers = set()
    company_md = home / "company" / "company.md"
    if company_md.exists():
        m = re.search(r'^owner_whatsapp:\s*["\']?([^"\'\r\n]+)', company_md.read_text(), re.MULTILINE)
        if m:
            numbers.add(m.group(1).strip())
    members_dir = home / "company" / "members"
    if members_dir.exists():
        for f in members_dir.glob("*.md"):
            if f.name.startswith("_"):
                continue
            m = re.search(r'^whatsapp:\s*["\']?([^"\'\r\n]+)', f.read_text(), re.MULTILINE)
            if m and m.group(1).strip():
                numbers.add(m.group(1).strip())
    return numbers


def sync(home: Path) -> list[str]:
    """Returns the merged, sorted allowlist. Caller applies it via `hermes config set`
    (YAML structure is too easy to corrupt with hand-written text edits — see
    hermes-agent skill's hard invariant: never hand-edit config.yaml)."""
    import yaml
    config_path = home / "config.yaml"
    existing: set[str] = set()
    if config_path.exists():
        data = yaml.safe_load(config_path.read_text()) or {}
        existing = set((((data.get("platforms") or {}).get("whatsapp") or {}).get("allow_from")) or [])
    return sorted(existing | collect_numbers(home))


if __name__ == "__main__":
    home = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    merged = sync(home)
    joined = ", ".join(merged)
    print(",".join(merged))
    print(
        "\nApply with (config.yaml wins over .env, so this is the only path that "
        "actually reaches the gateway's DM intake gate):\n"
        f"  hermes -p <profile> config set platforms.whatsapp.allow_from '[{joined}]'\n"
        "  hermes -p <profile> gateway restart",
        file=sys.stderr,
    )
