# Learning state contract

## Version

Use semantic schema versions. Version `1.0.0` is the initial public contract. Readers must preserve unknown fields. Writers must not silently downgrade a newer major version.

## Top-level fields

| Field | Type | Rule |
|---|---|---|
| `schema_version` | string | Required semantic version |
| `project` | object | Identity, goal, route, target, dates, constraints |
| `learner` | object | Baseline and non-sensitive preferences |
| `roadmap` | object | Ordered phases and learning units |
| `mastery` | object | Unit ID to current level and confidence |
| `weaknesses` | array | Confirmed or suspected gaps with closure conditions |
| `evidence` | array | Observable attempts and artifacts |
| `reviews` | array | Scheduled reviews and outcomes |
| `sessions` | array | Concise session summaries |
| `sources` | array | External content evidence ledger |
| `resume` | object | Last position and exact next action |
| `updated_at` | string | ISO 8601 UTC timestamp |

## Stable identifiers

Use readable prefixes plus random or time-derived suffixes:

- project: `prj_`
- unit: `unit_`
- evidence: `ev_`
- weakness: `weak_`
- review: `rev_`
- session: `ses_`
- source: `src_`

Never use array position as identity.

## Mastery entry

Each unit entry contains:

- `level`: integer 0–4;
- `confidence`: number 0–1;
- `target_level`: integer 1–4;
- `evidence_ids`: array of evidence IDs;
- `last_checked_at`: ISO timestamp or null;
- `status`: `not-started`, `learning`, `review`, or `mastered`.

## Evidence entry

Store:

- capability and unit ID;
- evidence type: `recall`, `explanation`, `application`, `transfer`, or `authentic-work`;
- result: `fail`, `partial`, `pass`, or `transfer`;
- hint level;
- concise observable summary;
- level supported;
- verification method;
- timestamp;
- optional artifact reference.

Do not store hidden chain-of-thought. A concise rationale or error description is sufficient.

## Weakness entry

Store status, observation, likely cause, diagnostic confidence, intervention, closure condition, recurrence count, linked evidence IDs, and timestamps.

## Review entry

Store unit ID, due date, priority, reason, status, interval days, stability count, and result history. Keep completed history rather than overwriting it.

## Invariants

- Every mastery key references an existing unit.
- Every evidence or review `unit_id` references an existing unit.
- Every evidence ID in mastery or weakness entries exists.
- Levels stay within 0–4 and confidence within 0–1.
- A mastered status requires `level >= target_level` and valid evidence.
- `resume.next_action` must be concrete enough to start without reconstructing chat history.
- Timestamps use ISO 8601; due dates use `YYYY-MM-DD`.

## Migration

Migrations must:

1. preserve the original file;
2. add safe defaults for missing fields;
3. preserve unknown fields;
4. validate the migrated copy;
5. write the new schema version only after successful conversion.

