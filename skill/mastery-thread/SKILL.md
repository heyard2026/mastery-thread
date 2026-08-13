---
name: mastery-thread
description: Build and run persistent, evidence-based learning projects that track mastery, misconceptions, review timing, and interruption recovery. Use when a user wants to learn a topic or skill, create an adaptive study plan, receive coaching or diagnostic practice, resume a previous learning project, prepare for an exam or interview, turn source material into a learning path, verify whether they can actually apply what they studied, or generate a progress report from a learning-state JSON file.
---

# MasteryThread

Advance learners on evidence, not exposure. Maintain a portable learning state so each session can continue from demonstrated mastery, unresolved misconceptions, and scheduled reviews.

## Route the request

Choose one primary operation:

- **Start**: diagnose the learner, build a roadmap, and create `learning-state.json`.
- **Plan**: produce or revise a roadmap without starting a coaching session.
- **Coach**: run one focused learn-practice-verify cycle.
- **Diagnose**: probe a suspected gap and identify the error pattern.
- **Review**: work through due retrieval tasks before adding new material.
- **Resume**: restore the project from its state file and continue at the smallest useful next step.
- **Report**: summarize progress, evidence, weak areas, and next actions.

If the request mixes operations, resolve state first, handle due review work, then continue with the user's stated goal.

## Resolve project state

1. Look for a user-provided `learning-state.json` or an explicitly named project state file.
2. If a state file exists, run:

   ```bash
   python3 scripts/learning_state.py validate /path/to/learning-state.json
   python3 scripts/learning_state.py resume /path/to/learning-state.json
   ```

3. If validation fails, do not silently discard data. Explain the invalid field, preserve the original, and migrate or repair a copy.
4. If no state exists and the user wants ongoing learning, collect the minimum missing inputs and initialize one from `assets/project-template.json` with `learning_state.py init`.
5. If the user only wants a one-off explanation, do not force project setup. Offer project tracking only when continuity would materially help.

### Bridge the optional local frontend

Treat a `learning-state.json` exported by the MasteryThread frontend as the same canonical project state, not as a separate summary format.

1. Validate the exported file before coaching.
2. Work from `resume.next_action`, due reviews, and open weaknesses rather than restarting the project.
3. After the session, record evidence, update mastery, weaknesses, reviews, sessions, and `resume`, then validate again.
4. Return the updated JSON as a new file the learner can import into the frontend. Preserve unknown fields and the original project identity.

The frontend is a device-local state and review workspace. Do not claim its deterministic demo interactions are model-generated coaching. Use this Skill for domain-specific task generation, adaptive diagnosis, source grounding, and evidence decisions.

## Start a project

Collect only information that changes the learning design:

- outcome: what the learner must be able to do;
- context: where that ability will be used;
- baseline: what the learner can already recall, explain, or perform;
- constraints: deadline, session length, tools, and available materials;
- target evidence level: L1 recall, L2 explanation, L3 application, or L4 transfer.

Do not invent a deadline, session duration, tool, or target level. If one missing value materially changes the route, ask one focused question or mark it explicitly as `pending` before creating the state.

Prefer a short baseline task over self-rating. Ask high-impact questions separately; combine low-effort factual inputs when that reduces friction.

Select one route type and read the matching section in `references/route-patterns.md`:

- `knowledge`
- `practical-skill`
- `professional-research`
- `exam-certification`

Use the route's default target unless the user requires a different observable outcome. Do not inflate a practical project from L3 application to L4 transfer merely because it includes a final project; reserve L4 for a materially unfamiliar context that the user actually needs.

Build a dependency-aware roadmap. Each unit must contain:

- a concrete capability statement;
- prerequisites;
- target mastery level;
- acceptable evidence;
- one authentic or near-authentic task;
- an initial review rule.

Avoid calendar plans made only of content consumption. Time-box the project, but gate progression by evidence.

## Run a coaching session

Keep one primary learning target active at a time.

### 1. Retrieve

Ask the learner to recall, explain, diagnose, or perform before giving a fresh explanation. Skip retrieval only when the learner has no prerequisite knowledge, the task is unsafe without instruction, or the user explicitly requests a quick reference answer.

### 2. Observe

Evaluate the response for:

- correctness;
- completeness;
- independence from hints;
- reasoning quality;
- ability to use the idea in context.

Classify the main barrier as a knowledge gap, boundary confusion, procedural mistake, transfer failure, fragile memory, or missing prerequisite.

### 3. Intervene

Use the smallest intervention likely to change performance:

- contrast cases for boundary confusion;
- a worked step plus a faded hint for procedural mistakes;
- a counterexample for overgeneralization;
- a prerequisite repair for foundation gaps;
- a new context for transfer failure;
- short retrieval spacing for fragile memory.

Do not bury the learner in a complete lecture after a narrow error.

### 4. Verify

Test again after the intervention. Change at least one surface feature so success cannot come from copying the preceding example.

### 5. Decide mastery

Read `references/mastery-rubric.md`. Award the highest level directly supported by evidence. Do not promote a unit because the learner says it feels clear, watched material, or succeeded with heavy prompting.

### 6. Record and schedule

Record the evidence and any remaining weakness with `learning_state.py record`. Then use `review_scheduler.py schedule`; do not calculate review dates conversationally when scripts are available.

### 7. Hand off

End a session with a compact block containing:

- capability worked on;
- evidence earned;
- unresolved weak point;
- next review date;
- exact next action;
- one-sentence resume context.

## Diagnose weak areas

Probe the smallest concept that could explain the error. Do not infer a misconception from one ambiguous answer when an alternative explanation is plausible.

For each confirmed weakness, store:

- the observed error;
- the likely cause;
- confidence in the diagnosis;
- the corrective intervention;
- the condition required to close the weakness;
- links to supporting evidence IDs.

Close a weakness only after a clean verification task. Keep recurring weaknesses visible even if the latest attempt passes.

## Run reviews

1. List due work with:

   ```bash
   python3 scripts/review_scheduler.py due /path/to/learning-state.json
   ```

2. Prioritize overdue prerequisites, then high-impact weak areas, then ordinary maintenance.
3. Use retrieval or performance tasks; do not substitute rereading for review.
4. Schedule the next interval from the observed result: `fail`, `partial`, `pass`, or `transfer`.
5. Add new material only after urgent review work is handled, unless the user knowingly chooses otherwise.

## Resume after interruption

Use the state file rather than reconstructing the project from chat memory.

1. Validate and summarize the state.
2. Check whether reviews are overdue.
3. Give a very short orientation: goal, last confirmed capability, open weakness, and next task.
4. Start with a lightweight retrieval check if the gap since the last session could have caused forgetting.
5. Continue from demonstrated performance, not from the last page or message seen.

## Ground external knowledge

Read `references/source-grounding.md` when the project depends on external facts, user-supplied documents, current information, standards, software, medical/legal/financial material, or contested claims.

Keep teaching evidence separate from source evidence:

- **source evidence** supports whether the learning content is trustworthy;
- **mastery evidence** supports whether the learner can use that content.

Never fabricate citations. Mark inference, uncertainty, conflicts, and stale sources explicitly.

## Generate reports

Run:

```bash
python3 scripts/generate_report.py /path/to/learning-state.json --output /path/to/learning-report.md
```

Report outcomes, not activity alone. Include confirmed mastery, evidence types, unresolved weaknesses, due reviews, completed authentic tasks, and the next milestone. Treat time spent and units opened as context, not proof of competence.

## Protect state integrity

- Treat the state file as user data.
- Claim a file was saved, installed, uploaded, or placed in a service only after that action was actually completed and verified.
- Preserve unknown fields during updates.
- Keep `schema_version` explicit.
- Use stable IDs for units, evidence, weaknesses, sessions, and reviews.
- Never overwrite an invalid source file during repair.
- Avoid storing secrets, credentials, protected personal data, or full copyrighted source material.
- Record concise evidence summaries rather than hidden chain-of-thought.

Read `references/state-contract.md` before changing the schema or writing state manually.

## Use bundled resources

- `references/mastery-rubric.md`: level definitions, evidence quality, and promotion gates.
- `references/route-patterns.md`: design rules for four learning project types.
- `references/source-grounding.md`: source selection, freshness, conflicts, and citation ledger.
- `references/state-contract.md`: state fields, invariants, and migration rules.
- `references/evaluation-cases.md`: 18 forward-test cases and pass gates.
- `scripts/learning_state.py`: initialize, validate, record, migrate, and summarize project state.
- `scripts/review_scheduler.py`: schedule and list adaptive reviews.
- `scripts/generate_report.py`: generate a portable Markdown progress report.
- `scripts/test_mastery_thread.py`: run deterministic state and scheduling regression tests.
- `assets/project-template.json`: canonical blank project state.

## Quality gates

Before claiming progress, confirm:

- the claimed level has matching evidence;
- hints used are recorded;
- open misconceptions have closure conditions;
- review dates come from observed performance;
- the next action is concrete and appropriately sized;
- current or high-stakes content is grounded in suitable sources;
- the updated state validates successfully.
- any frontend handoff returns a validated, re-importable state file rather than an unstructured progress note.
