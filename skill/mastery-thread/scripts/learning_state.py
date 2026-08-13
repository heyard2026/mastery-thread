#!/usr/bin/env python3
"""Create, validate, update, migrate, and summarize MasteryThread state files."""

from __future__ import annotations

import argparse
import copy
import json
import os
import re
import sys
import tempfile
import uuid
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any


SCHEMA_VERSION = "1.0.0"
ROUTE_TYPES = {"knowledge", "practical-skill", "professional-research", "exam-certification"}
EVIDENCE_TYPES = {"recall", "explanation", "application", "transfer", "authentic-work"}
RESULTS = {"fail", "partial", "pass", "transfer"}
HINT_LEVELS = {"none", "clarification", "cue", "scaffold", "worked-step", "solution"}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def make_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def load_state(path: str | Path) -> dict[str, Any]:
    with Path(path).open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("State root must be a JSON object")
    return data


def atomic_write(path: str | Path, data: dict[str, Any]) -> None:
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=f".{destination.name}.", suffix=".tmp", dir=destination.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, destination)
    except Exception:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass
        raise


def default_state(title: str, goal: str, route_type: str, target_level: int,
                  deadline: str | None, minutes_per_session: int) -> dict[str, Any]:
    now = utc_now()
    return {
        "schema_version": SCHEMA_VERSION,
        "project": {
            "id": make_id("prj"),
            "title": title,
            "goal": goal,
            "route_type": route_type,
            "target_level": target_level,
            "created_at": now,
            "start_date": date.today().isoformat(),
            "deadline": deadline,
            "minutes_per_session": minutes_per_session,
            "status": "active",
        },
        "learner": {"baseline_summary": "", "preferences": [], "constraints": []},
        "roadmap": {"phases": [], "units": []},
        "mastery": {},
        "weaknesses": [],
        "evidence": [],
        "reviews": [],
        "sessions": [],
        "sources": [],
        "resume": {
            "last_unit_id": None,
            "last_confirmed_capability": "",
            "open_weakness_ids": [],
            "next_action": "Complete the baseline diagnostic.",
            "context_summary": "Project created; baseline evidence is still required.",
        },
        "updated_at": now,
    }


def unit_map(state: dict[str, Any]) -> dict[str, dict[str, Any]]:
    units = state.get("roadmap", {}).get("units", [])
    return {unit.get("id"): unit for unit in units if isinstance(unit, dict) and unit.get("id")}


def validate_state(state: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    required = [
        "schema_version", "project", "learner", "roadmap", "mastery", "weaknesses",
        "evidence", "reviews", "sessions", "sources", "resume", "updated_at",
    ]
    for field in required:
        if field not in state:
            errors.append(f"Missing top-level field: {field}")

    version = state.get("schema_version")
    if not isinstance(version, str) or not re.fullmatch(r"\d+\.\d+\.\d+", version):
        errors.append("schema_version must be semantic version text")
    elif version.split(".")[0] != SCHEMA_VERSION.split(".")[0]:
        errors.append(f"Unsupported schema major version: {version}")

    project = state.get("project")
    if not isinstance(project, dict):
        errors.append("project must be an object")
    else:
        if not str(project.get("id", "")).startswith("prj_"):
            errors.append("project.id must start with prj_")
        if not project.get("title"):
            errors.append("project.title is required")
        if not project.get("goal"):
            errors.append("project.goal is required")
        if project.get("route_type") not in ROUTE_TYPES:
            errors.append("project.route_type is invalid")
        if project.get("target_level") not in {1, 2, 3, 4}:
            errors.append("project.target_level must be 1-4")

    roadmap = state.get("roadmap")
    if not isinstance(roadmap, dict) or not isinstance(roadmap.get("units"), list):
        errors.append("roadmap.units must be an array")
        units: dict[str, dict[str, Any]] = {}
    else:
        units = unit_map(state)
        raw_ids = [unit.get("id") for unit in roadmap["units"] if isinstance(unit, dict)]
        if len(raw_ids) != len(set(raw_ids)):
            errors.append("roadmap unit IDs must be unique")

    mastery = state.get("mastery")
    if not isinstance(mastery, dict):
        errors.append("mastery must be an object")
    else:
        for unit_id, entry in mastery.items():
            if unit_id not in units:
                errors.append(f"mastery references unknown unit: {unit_id}")
            if not isinstance(entry, dict):
                errors.append(f"mastery.{unit_id} must be an object")
                continue
            if entry.get("level") not in {0, 1, 2, 3, 4}:
                errors.append(f"mastery.{unit_id}.level must be 0-4")
            confidence = entry.get("confidence")
            if not isinstance(confidence, (int, float)) or not 0 <= confidence <= 1:
                errors.append(f"mastery.{unit_id}.confidence must be 0-1")
            target_level = entry.get("target_level")
            if target_level not in {1, 2, 3, 4}:
                errors.append(f"mastery.{unit_id}.target_level must be 1-4")
            if target_level in {1, 2, 3, 4} and entry.get("status") == "mastered" and entry.get("level", 0) < target_level:
                errors.append(f"mastery.{unit_id} cannot be mastered below target level")

    evidence = state.get("evidence")
    evidence_ids: set[str] = set()
    if not isinstance(evidence, list):
        errors.append("evidence must be an array")
    else:
        for item in evidence:
            if not isinstance(item, dict):
                errors.append("each evidence item must be an object")
                continue
            evidence_ids.add(str(item.get("id", "")))
            if item.get("unit_id") not in units:
                errors.append(f"evidence references unknown unit: {item.get('unit_id')}")
            if item.get("type") not in EVIDENCE_TYPES:
                errors.append(f"evidence type is invalid: {item.get('type')}")
            if item.get("result") not in RESULTS:
                errors.append(f"evidence result is invalid: {item.get('result')}")
            if item.get("hint_level") not in HINT_LEVELS:
                errors.append(f"evidence hint level is invalid: {item.get('hint_level')}")
            if item.get("supported_level") not in {0, 1, 2, 3, 4}:
                errors.append(f"evidence supported level must be 0-4: {item.get('id')}")
        if len(evidence_ids) != len(evidence):
            errors.append("evidence IDs must be present and unique")

    for unit_id, entry in (mastery.items() if isinstance(mastery, dict) else []):
        for evidence_id in entry.get("evidence_ids", []):
            if evidence_id not in evidence_ids:
                errors.append(f"mastery.{unit_id} references unknown evidence: {evidence_id}")

    for collection in ("weaknesses", "reviews", "sessions", "sources"):
        if not isinstance(state.get(collection), list):
            errors.append(f"{collection} must be an array")

    if isinstance(state.get("weaknesses"), list):
        for item in state["weaknesses"]:
            if not isinstance(item, dict):
                errors.append("each weakness must be an object")
                continue
            if item.get("unit_id") not in units:
                errors.append(f"weakness references unknown unit: {item.get('unit_id')}")
            for evidence_id in item.get("evidence_ids", []):
                if evidence_id not in evidence_ids:
                    errors.append(f"weakness references unknown evidence: {evidence_id}")

    if isinstance(state.get("reviews"), list):
        for item in state["reviews"]:
            if not isinstance(item, dict):
                errors.append("each review must be an object")
                continue
            if item.get("unit_id") not in units:
                errors.append(f"review references unknown unit: {item.get('unit_id')}")

    resume = state.get("resume")
    if not isinstance(resume, dict):
        errors.append("resume must be an object")
    elif not resume.get("next_action"):
        errors.append("resume.next_action is required")

    return errors


def ensure_valid(state: dict[str, Any]) -> None:
    errors = validate_state(state)
    if errors:
        raise ValueError("\n".join(errors))


def command_init(args: argparse.Namespace) -> None:
    destination = Path(args.path)
    if destination.exists():
        raise FileExistsError(f"Refusing to overwrite existing file: {destination}")
    state = default_state(args.title, args.goal, args.route_type, args.target_level,
                          args.deadline, args.minutes_per_session)
    ensure_valid(state)
    atomic_write(destination, state)
    print(destination)


def command_add_unit(args: argparse.Namespace) -> None:
    state = load_state(args.path)
    ensure_valid(state)
    unit_id = args.unit_id or make_id("unit")
    if unit_id in unit_map(state):
        raise ValueError(f"Unit already exists: {unit_id}")
    prerequisites = [item.strip() for item in args.prerequisites.split(",") if item.strip()]
    unknown = [item for item in prerequisites if item not in unit_map(state)]
    if unknown:
        raise ValueError(f"Unknown prerequisites: {', '.join(unknown)}")
    unit = {
        "id": unit_id,
        "phase": args.phase,
        "title": args.title,
        "capability": args.capability,
        "prerequisites": prerequisites,
        "target_level": args.target_level,
        "acceptable_evidence": args.acceptable_evidence,
        "authentic_task": args.authentic_task,
        "status": "not-started",
    }
    state["roadmap"]["units"].append(unit)
    if args.phase and args.phase not in state["roadmap"]["phases"]:
        state["roadmap"]["phases"].append(args.phase)
    state["mastery"][unit_id] = {
        "level": 0,
        "confidence": 0.0,
        "target_level": args.target_level,
        "evidence_ids": [],
        "last_checked_at": None,
        "status": "not-started",
    }
    state["updated_at"] = utc_now()
    ensure_valid(state)
    atomic_write(args.path, state)
    print(unit_id)


def command_record(args: argparse.Namespace) -> None:
    state = load_state(args.path)
    ensure_valid(state)
    units = unit_map(state)
    if args.unit_id not in units:
        raise ValueError(f"Unknown unit: {args.unit_id}")
    if not 0 <= args.confidence <= 1:
        raise ValueError("confidence must be between 0 and 1")
    if not 0 <= args.diagnostic_confidence <= 1:
        raise ValueError("diagnostic-confidence must be between 0 and 1")
    if args.supported_level >= 3 and args.hint_level in {"worked-step", "solution"}:
        raise ValueError("worked-step or solution evidence cannot support L3 or L4")
    if args.supported_level >= 3 and args.result not in {"pass", "transfer"}:
        raise ValueError("L3 or L4 requires a pass or transfer result")
    if args.supported_level == 4 and (args.result != "transfer" or args.evidence_type not in {"transfer", "authentic-work"}):
        raise ValueError("L4 requires transfer evidence with a transfer result")
    evidence_id = make_id("ev")
    now = utc_now()
    evidence = {
        "id": evidence_id,
        "unit_id": args.unit_id,
        "capability": units[args.unit_id].get("capability", ""),
        "type": args.evidence_type,
        "result": args.result,
        "hint_level": args.hint_level,
        "summary": args.summary,
        "supported_level": args.supported_level,
        "verification": args.verification,
        "artifact": args.artifact,
        "recorded_at": now,
    }
    state["evidence"].append(evidence)
    mastery = state["mastery"][args.unit_id]
    mastery["level"] = max(mastery.get("level", 0), args.supported_level)
    mastery["confidence"] = args.confidence
    mastery.setdefault("evidence_ids", []).append(evidence_id)
    mastery["last_checked_at"] = now
    target = mastery.get("target_level", units[args.unit_id].get("target_level", 2))
    mastery["status"] = "mastered" if mastery["level"] >= target and args.result in {"pass", "transfer"} else "learning"
    units[args.unit_id]["status"] = mastery["status"]

    if args.weakness_observation:
        existing = next((
            item for item in state["weaknesses"]
            if item.get("status") == "open"
            and item.get("unit_id") == args.unit_id
            and item.get("observation") == args.weakness_observation
        ), None)
        if existing:
            existing["likely_cause"] = args.weakness_cause or existing.get("likely_cause", "")
            existing["diagnostic_confidence"] = args.diagnostic_confidence
            existing["intervention"] = args.intervention or existing.get("intervention", "")
            existing["closure_condition"] = args.closure_condition
            existing["recurrence_count"] = int(existing.get("recurrence_count", 1)) + 1
            existing.setdefault("evidence_ids", []).append(evidence_id)
            existing["updated_at"] = now
        else:
            weakness_id = make_id("weak")
            state["weaknesses"].append({
                "id": weakness_id,
                "unit_id": args.unit_id,
                "status": "open",
                "observation": args.weakness_observation,
                "likely_cause": args.weakness_cause,
                "diagnostic_confidence": args.diagnostic_confidence,
                "intervention": args.intervention,
                "closure_condition": args.closure_condition,
                "recurrence_count": 1,
                "evidence_ids": [evidence_id],
                "created_at": now,
                "updated_at": now,
            })
    open_weaknesses = [item["id"] for item in state["weaknesses"] if item.get("status") == "open"]
    session_id = make_id("ses")
    state["sessions"].append({
        "id": session_id,
        "unit_id": args.unit_id,
        "summary": args.session_summary or args.summary,
        "evidence_ids": [evidence_id],
        "started_at": now,
        "ended_at": now,
    })
    state["resume"] = {
        "last_unit_id": args.unit_id,
        "last_confirmed_capability": units[args.unit_id].get("capability", "") if args.result in {"pass", "transfer"} else "",
        "open_weakness_ids": open_weaknesses,
        "next_action": args.next_action,
        "context_summary": args.context_summary or args.summary,
    }
    state["updated_at"] = now
    ensure_valid(state)
    atomic_write(args.path, state)
    print(evidence_id)


def command_close_weakness(args: argparse.Namespace) -> None:
    state = load_state(args.path)
    ensure_valid(state)
    weakness = next((item for item in state["weaknesses"] if item.get("id") == args.weakness_id), None)
    if not weakness:
        raise ValueError(f"Unknown weakness: {args.weakness_id}")
    evidence = next((item for item in state["evidence"] if item.get("id") == args.evidence_id), None)
    if not evidence:
        raise ValueError(f"Unknown evidence: {args.evidence_id}")
    if evidence.get("unit_id") != weakness.get("unit_id"):
        raise ValueError("Closure evidence must belong to the same unit as the weakness")
    if evidence.get("result") not in {"pass", "transfer"}:
        raise ValueError("Closure evidence must have a pass or transfer result")
    weakness["status"] = "closed"
    weakness["closed_at"] = utc_now()
    weakness["closure_evidence_id"] = args.evidence_id
    weakness["updated_at"] = weakness["closed_at"]
    state["resume"]["open_weakness_ids"] = [
        item["id"] for item in state["weaknesses"] if item.get("status") == "open"
    ]
    state["updated_at"] = utc_now()
    ensure_valid(state)
    atomic_write(args.path, state)
    print(args.weakness_id)


def command_validate(args: argparse.Namespace) -> None:
    state = load_state(args.path)
    errors = validate_state(state)
    if errors:
        print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
        raise SystemExit(1)
    print(json.dumps({"valid": True, "schema_version": state["schema_version"]}, indent=2))


def command_resume(args: argparse.Namespace) -> None:
    state = load_state(args.path)
    ensure_valid(state)
    today = date.today().isoformat()
    due = [review for review in state["reviews"] if review.get("status") == "pending" and review.get("due_date", "9999") <= today]
    open_weaknesses = [item for item in state["weaknesses"] if item.get("status") == "open"]
    output = {
        "project": state["project"]["title"],
        "goal": state["project"]["goal"],
        "last_unit_id": state["resume"].get("last_unit_id"),
        "last_confirmed_capability": state["resume"].get("last_confirmed_capability", ""),
        "overdue_reviews": len(due),
        "open_weaknesses": len(open_weaknesses),
        "next_action": state["resume"].get("next_action"),
        "context_summary": state["resume"].get("context_summary"),
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))


def command_migrate(args: argparse.Namespace) -> None:
    source = Path(args.path)
    destination = Path(args.output)
    if destination.exists():
        raise FileExistsError(f"Refusing to overwrite existing file: {destination}")
    state = copy.deepcopy(load_state(source))
    if str(state.get("schema_version", "0.0.0")).split(".")[0] not in {"0", "1"}:
        raise ValueError("Cannot migrate an unsupported future major version")
    defaults = default_state(
        state.get("project", {}).get("title", "Migrated learning project"),
        state.get("project", {}).get("goal", "Define the project goal"),
        state.get("project", {}).get("route_type", "knowledge"),
        state.get("project", {}).get("target_level", 2),
        state.get("project", {}).get("deadline"),
        state.get("project", {}).get("minutes_per_session", 30),
    )
    for key, value in defaults.items():
        state.setdefault(key, value)
    state["schema_version"] = SCHEMA_VERSION
    state["updated_at"] = utc_now()
    ensure_valid(state)
    atomic_write(destination, state)
    print(destination)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    init = subparsers.add_parser("init", help="Create a new learning state")
    init.add_argument("path")
    init.add_argument("--title", required=True)
    init.add_argument("--goal", required=True)
    init.add_argument("--route-type", choices=sorted(ROUTE_TYPES), required=True)
    init.add_argument("--target-level", type=int, choices=range(1, 5), required=True)
    init.add_argument("--deadline")
    init.add_argument("--minutes-per-session", type=int, default=30)
    init.set_defaults(func=command_init)

    add_unit = subparsers.add_parser("add-unit", help="Add a roadmap unit")
    add_unit.add_argument("path")
    add_unit.add_argument("--unit-id")
    add_unit.add_argument("--phase", required=True)
    add_unit.add_argument("--title", required=True)
    add_unit.add_argument("--capability", required=True)
    add_unit.add_argument("--prerequisites", default="")
    add_unit.add_argument("--target-level", type=int, choices=range(1, 5), required=True)
    add_unit.add_argument("--acceptable-evidence", required=True)
    add_unit.add_argument("--authentic-task", required=True)
    add_unit.set_defaults(func=command_add_unit)

    record = subparsers.add_parser("record", help="Record evidence and update mastery")
    record.add_argument("path")
    record.add_argument("--unit-id", required=True)
    record.add_argument("--evidence-type", choices=sorted(EVIDENCE_TYPES), required=True)
    record.add_argument("--result", choices=sorted(RESULTS), required=True)
    record.add_argument("--hint-level", choices=sorted(HINT_LEVELS), default="none")
    record.add_argument("--summary", required=True)
    record.add_argument("--supported-level", type=int, choices=range(0, 5), required=True)
    record.add_argument("--confidence", type=float, required=True)
    record.add_argument("--verification", required=True)
    record.add_argument("--artifact")
    record.add_argument("--weakness-observation")
    record.add_argument("--weakness-cause", default="")
    record.add_argument("--diagnostic-confidence", type=float, default=0.5)
    record.add_argument("--intervention", default="")
    record.add_argument("--closure-condition", default="Complete a clean verification task.")
    record.add_argument("--session-summary")
    record.add_argument("--next-action", required=True)
    record.add_argument("--context-summary")
    record.set_defaults(func=command_record)

    close_weakness = subparsers.add_parser("close-weakness", help="Close a weakness using clean verification evidence")
    close_weakness.add_argument("path")
    close_weakness.add_argument("--weakness-id", required=True)
    close_weakness.add_argument("--evidence-id", required=True)
    close_weakness.set_defaults(func=command_close_weakness)

    validate = subparsers.add_parser("validate", help="Validate a learning state")
    validate.add_argument("path")
    validate.set_defaults(func=command_validate)

    resume = subparsers.add_parser("resume", help="Print compact resume context")
    resume.add_argument("path")
    resume.set_defaults(func=command_resume)

    migrate = subparsers.add_parser("migrate", help="Migrate to the current schema without overwriting the source")
    migrate.add_argument("path")
    migrate.add_argument("--output", required=True)
    migrate.set_defaults(func=command_migrate)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        args.func(args)
        return 0
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
