#!/usr/bin/env python3
"""Schedule adaptive reviews and list due MasteryThread work."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime, timedelta, timezone
from typing import Any

from learning_state import atomic_write, ensure_valid, load_state, make_id, unit_map, utc_now


RESULTS = {"fail", "partial", "pass", "transfer"}


def parse_day(value: str | None) -> date:
    return date.fromisoformat(value) if value else date.today()


def current_stability(state: dict[str, Any], unit_id: str) -> int:
    values = [int(item.get("stability", 0)) for item in state["reviews"] if item.get("unit_id") == unit_id]
    return max(values, default=0)


def next_interval(result: str, stability: int) -> tuple[int, int]:
    if result == "fail":
        return 0, 0
    if result == "partial":
        return 1, max(0, stability - 1)
    if result == "pass":
        intervals = [3, 7, 14, 30, 60]
        new_stability = min(stability + 1, len(intervals))
        return intervals[new_stability - 1], new_stability
    intervals = [14, 30, 60, 90, 120]
    new_stability = min(stability + 2, len(intervals))
    return intervals[new_stability - 1], new_stability


def command_schedule(args: argparse.Namespace) -> None:
    state = load_state(args.path)
    ensure_valid(state)
    if args.unit_id not in unit_map(state):
        raise ValueError(f"Unknown unit: {args.unit_id}")
    observed = parse_day(args.date)
    stability = current_stability(state, args.unit_id)
    interval, new_stability = next_interval(args.result, stability)
    for review in state["reviews"]:
        if review.get("unit_id") == args.unit_id and review.get("status") == "pending":
            review["status"] = "completed"
            review["completed_at"] = utc_now()
            review.setdefault("result_history", []).append({"date": observed.isoformat(), "result": args.result})
    review = {
        "id": make_id("rev"),
        "unit_id": args.unit_id,
        "created_at": utc_now(),
        "due_date": (observed + timedelta(days=interval)).isoformat(),
        "priority": "high" if args.result in {"fail", "partial"} else "normal",
        "reason": args.reason,
        "status": "pending",
        "interval_days": interval,
        "stability": new_stability,
        "trigger_result": args.result,
        "result_history": [],
    }
    state["reviews"].append(review)
    state["updated_at"] = utc_now()
    ensure_valid(state)
    atomic_write(args.path, state)
    print(json.dumps(review, ensure_ascii=False, indent=2))


def command_due(args: argparse.Namespace) -> None:
    state = load_state(args.path)
    ensure_valid(state)
    start = parse_day(args.date)
    end = start + timedelta(days=args.days)
    units = unit_map(state)
    due = []
    for review in state["reviews"]:
        if review.get("status") != "pending":
            continue
        due_date = date.fromisoformat(review["due_date"])
        if due_date <= end:
            item = dict(review)
            item["unit_title"] = units.get(review.get("unit_id"), {}).get("title", review.get("unit_id"))
            item["overdue_days"] = max(0, (start - due_date).days)
            due.append(item)
    due.sort(key=lambda item: (0 if item.get("priority") == "high" else 1, item["due_date"]))
    print(json.dumps({"from": start.isoformat(), "through": end.isoformat(), "items": due}, ensure_ascii=False, indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    schedule = subparsers.add_parser("schedule", help="Schedule the next review from an observed result")
    schedule.add_argument("path")
    schedule.add_argument("--unit-id", required=True)
    schedule.add_argument("--result", choices=sorted(RESULTS), required=True)
    schedule.add_argument("--date")
    schedule.add_argument("--reason", default="Maintain demonstrated mastery")
    schedule.set_defaults(func=command_schedule)
    due = subparsers.add_parser("due", help="List reviews due within a window")
    due.add_argument("path")
    due.add_argument("--date")
    due.add_argument("--days", type=int, default=0)
    due.set_defaults(func=command_due)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        args.func(args)
        return 0
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
