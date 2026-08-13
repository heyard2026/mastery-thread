#!/usr/bin/env python3
"""Generate an outcome-focused Markdown report from MasteryThread state."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

from learning_state import ensure_valid, load_state, unit_map


LEVEL_NAMES = {0: "L0 Not evidenced", 1: "L1 Recall", 2: "L2 Explain", 3: "L3 Apply", 4: "L4 Transfer"}


def escape(value: object) -> str:
    return str(value or "").replace("|", "\\|").replace("\n", " ")


def build_report(state: dict) -> str:
    project = state["project"]
    units = unit_map(state)
    mastery = state["mastery"]
    mastered = [uid for uid, item in mastery.items() if item.get("level", 0) >= item.get("target_level", 5)]
    open_weaknesses = [item for item in state["weaknesses"] if item.get("status") == "open"]
    due = [item for item in state["reviews"] if item.get("status") == "pending" and item.get("due_date", "9999") <= date.today().isoformat()]
    authentic = [item for item in state["evidence"] if item.get("type") == "authentic-work" and item.get("result") in {"pass", "transfer"}]
    lines = [
        f"# {escape(project['title'])} — Learning report",
        "",
        f"- **Goal:** {escape(project['goal'])}",
        f"- **Route:** {escape(project['route_type'])}",
        f"- **Target:** L{project['target_level']}",
        f"- **Updated:** {escape(state['updated_at'])}",
        "",
        "## Outcome summary",
        "",
        f"- Roadmap units: {len(units)}",
        f"- Units at target: {len(mastered)}",
        f"- Evidence records: {len(state['evidence'])}",
        f"- Open weaknesses: {len(open_weaknesses)}",
        f"- Reviews due: {len(due)}",
        "",
        "## Mastery by capability",
        "",
        "| Capability | Current | Target | Confidence | Status |",
        "|---|---:|---:|---:|---|",
    ]
    for unit_id, unit in units.items():
        item = mastery.get(unit_id, {"level": 0, "target_level": unit.get("target_level", 2), "confidence": 0, "status": "not-started"})
        lines.append(
            f"| {escape(unit.get('capability') or unit.get('title'))} | {escape(LEVEL_NAMES.get(item['level'], item['level']))} "
            f"| L{item.get('target_level')} | {item.get('confidence', 0):.0%} | {escape(item.get('status'))} |"
        )
    lines.extend(["", "## Open weaknesses", ""])
    if open_weaknesses:
        for item in open_weaknesses:
            lines.append(f"- **{escape(units.get(item.get('unit_id'), {}).get('title', item.get('unit_id')))}:** {escape(item.get('observation'))}")
            lines.append(f"  - Closure: {escape(item.get('closure_condition'))}")
    else:
        lines.append("- No open weaknesses recorded.")
    lines.extend(["", "## Authentic work completed", ""])
    if authentic:
        for item in authentic:
            lines.append(f"- {escape(item.get('summary'))}")
    else:
        lines.append("- No verified authentic work recorded yet.")
    lines.extend(["", "## Next action", "", escape(state["resume"].get("next_action")), ""])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path")
    parser.add_argument("--output")
    args = parser.parse_args()
    try:
        state = load_state(args.path)
        ensure_valid(state)
        report = build_report(state)
        if args.output:
            destination = Path(args.output)
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(report, encoding="utf-8")
            print(destination)
        else:
            print(report)
        return 0
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
