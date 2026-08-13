#!/usr/bin/env python3
"""Deterministic regression tests for MasteryThread scripts."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / "scripts" / "learning_state.py"
REVIEW = ROOT / "scripts" / "review_scheduler.py"
REPORT = ROOT / "scripts" / "generate_report.py"


class MasteryThreadTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / "state.json"
        self.cli(STATE, "init", self.path, "--title", "Test project", "--goal", "Apply a skill",
                 "--route-type", "practical-skill", "--target-level", "3")
        self.cli(STATE, "add-unit", self.path, "--unit-id", "unit_core", "--phase", "Core",
                 "--title", "Core task", "--capability", "Complete the core task", "--target-level", "3",
                 "--acceptable-evidence", "Independent checked result", "--authentic-task", "Build a result")

    def tearDown(self) -> None:
        self.temp.cleanup()

    def cli(self, script: Path, *args: object, check: bool = True) -> subprocess.CompletedProcess[str]:
        return subprocess.run([sys.executable, str(script), *map(str, args)], text=True,
                              capture_output=True, check=check)

    def load(self) -> dict:
        return json.loads(self.path.read_text(encoding="utf-8"))

    def record(self, result: str = "pass", level: int = 3, hint: str = "none", **extra: str) -> str:
        command: list[object] = [
            "record", self.path, "--unit-id", "unit_core", "--evidence-type", "application",
            "--result", result, "--hint-level", hint, "--summary", "Observable attempt",
            "--supported-level", level, "--confidence", "0.8", "--verification", "Checked result",
            "--next-action", "Do the next task",
        ]
        for key, value in extra.items():
            command.extend([f"--{key.replace('_', '-')}", value])
        return self.cli(STATE, *command).stdout.strip()

    def test_01_new_state_validates(self) -> None:
        result = self.cli(STATE, "validate", self.path)
        self.assertIn('"valid": true', result.stdout)

    def test_02_refuses_overwrite(self) -> None:
        result = self.cli(STATE, "init", self.path, "--title", "Again", "--goal", "Again",
                          "--route-type", "knowledge", "--target-level", "2", check=False)
        self.assertNotEqual(result.returncode, 0)

    def test_03_unknown_prerequisite_fails(self) -> None:
        result = self.cli(STATE, "add-unit", self.path, "--phase", "Next", "--title", "Next",
                          "--capability", "Next", "--prerequisites", "unit_missing", "--target-level", "3",
                          "--acceptable-evidence", "Result", "--authentic-task", "Task", check=False)
        self.assertNotEqual(result.returncode, 0)

    def test_04_independent_application_reaches_l3(self) -> None:
        self.record()
        self.assertEqual(self.load()["mastery"]["unit_core"]["level"], 3)

    def test_05_solution_cannot_support_l3(self) -> None:
        result = self.cli(STATE, "record", self.path, "--unit-id", "unit_core", "--evidence-type", "application",
                          "--result", "pass", "--hint-level", "solution", "--summary", "Copied",
                          "--supported-level", "3", "--confidence", "0.9", "--verification", "None",
                          "--next-action", "Retry", check=False)
        self.assertNotEqual(result.returncode, 0)

    def test_06_l4_requires_transfer(self) -> None:
        result = self.cli(STATE, "record", self.path, "--unit-id", "unit_core", "--evidence-type", "application",
                          "--result", "pass", "--hint-level", "none", "--summary", "Pass",
                          "--supported-level", "4", "--confidence", "0.9", "--verification", "Checked",
                          "--next-action", "Next", check=False)
        self.assertNotEqual(result.returncode, 0)

    def test_07_confidence_range_enforced(self) -> None:
        result = self.cli(STATE, "record", self.path, "--unit-id", "unit_core", "--evidence-type", "recall",
                          "--result", "pass", "--summary", "Pass", "--supported-level", "1",
                          "--confidence", "1.2", "--verification", "Checked", "--next-action", "Next", check=False)
        self.assertNotEqual(result.returncode, 0)

    def test_08_recurring_weakness_is_merged(self) -> None:
        kwargs = {"weakness_observation": "Repeated error", "closure_condition": "Pass a clean task"}
        self.record(result="partial", level=1, **kwargs)
        self.record(result="partial", level=1, **kwargs)
        weaknesses = self.load()["weaknesses"]
        self.assertEqual(len(weaknesses), 1)
        self.assertEqual(weaknesses[0]["recurrence_count"], 2)

    def test_09_weakness_requires_passing_closure(self) -> None:
        failed = self.record(result="partial", level=1, weakness_observation="Error")
        weakness = self.load()["weaknesses"][0]["id"]
        result = self.cli(STATE, "close-weakness", self.path, "--weakness-id", weakness,
                          "--evidence-id", failed, check=False)
        self.assertNotEqual(result.returncode, 0)

    def test_10_passing_evidence_closes_weakness(self) -> None:
        self.record(result="partial", level=1, weakness_observation="Error")
        weakness = self.load()["weaknesses"][0]["id"]
        passed = self.record()
        self.cli(STATE, "close-weakness", self.path, "--weakness-id", weakness, "--evidence-id", passed)
        self.assertEqual(self.load()["weaknesses"][0]["status"], "closed")

    def test_11_fail_review_is_immediate(self) -> None:
        output = self.cli(REVIEW, "schedule", self.path, "--unit-id", "unit_core", "--result", "fail",
                          "--date", "2026-01-10").stdout
        self.assertEqual(json.loads(output)["due_date"], "2026-01-10")

    def test_12_partial_review_is_next_day(self) -> None:
        output = self.cli(REVIEW, "schedule", self.path, "--unit-id", "unit_core", "--result", "partial",
                          "--date", "2026-01-10").stdout
        self.assertEqual(json.loads(output)["due_date"], "2026-01-11")

    def test_13_pass_intervals_expand(self) -> None:
        first = json.loads(self.cli(REVIEW, "schedule", self.path, "--unit-id", "unit_core", "--result", "pass",
                                    "--date", "2026-01-10").stdout)
        second = json.loads(self.cli(REVIEW, "schedule", self.path, "--unit-id", "unit_core", "--result", "pass",
                                     "--date", first["due_date"]).stdout)
        self.assertGreater(second["interval_days"], first["interval_days"])

    def test_14_due_queue_includes_window(self) -> None:
        self.cli(REVIEW, "schedule", self.path, "--unit-id", "unit_core", "--result", "pass", "--date", "2026-01-10")
        output = self.cli(REVIEW, "due", self.path, "--date", "2026-01-10", "--days", "3").stdout
        self.assertEqual(len(json.loads(output)["items"]), 1)

    def test_15_resume_uses_state(self) -> None:
        self.record()
        output = json.loads(self.cli(STATE, "resume", self.path).stdout)
        self.assertEqual(output["last_unit_id"], "unit_core")

    def test_16_report_leads_with_outcomes(self) -> None:
        self.record()
        output = self.cli(REPORT, self.path).stdout
        self.assertIn("## Outcome summary", output)
        self.assertIn("## Open weaknesses", output)

    def test_17_migration_preserves_unknown_fields(self) -> None:
        state = self.load()
        state["extension_data"] = {"keep": True}
        state["schema_version"] = "0.9.0"
        self.path.write_text(json.dumps(state), encoding="utf-8")
        migrated = Path(self.temp.name) / "migrated.json"
        self.cli(STATE, "migrate", self.path, "--output", migrated)
        self.assertTrue(json.loads(migrated.read_text())["extension_data"]["keep"])

    def test_18_unknown_mastery_unit_fails_validation(self) -> None:
        state = self.load()
        state["mastery"]["unit_missing"] = {"level": 0, "confidence": 0, "target_level": 2,
                                                   "evidence_ids": [], "last_checked_at": None, "status": "not-started"}
        self.path.write_text(json.dumps(state), encoding="utf-8")
        result = self.cli(STATE, "validate", self.path, check=False)
        self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
