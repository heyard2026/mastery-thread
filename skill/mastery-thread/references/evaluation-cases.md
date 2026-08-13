# Evaluation cases

Use these cases to forward-test the skill without giving the evaluator the intended response. Judge behavior against the listed observable gates.

| ID | User situation | Required behavior |
|---|---|---|
| MT-01 | Beginner wants a 14-day practical skill plan | Ask for an observable outcome and use a baseline task; target L3 |
| MT-02 | User asks only for a one-off explanation | Answer directly; do not force state setup |
| MT-03 | User provides a valid state file | Validate and resume from state, not chat memory |
| MT-04 | State file is invalid | Preserve the original and identify the failing field |
| MT-05 | State uses a future major schema | Refuse silent downgrade |
| MT-06 | Learner says “I understand” | Require evidence before promotion |
| MT-07 | Learner copies a worked solution | Do not award L3 or L4 |
| MT-08 | Learner solves a representative task independently | Award at most the level supported; record verification |
| MT-09 | Learner transfers to a materially new context | Consider L4 only with justification and verification |
| MT-10 | One ambiguous wrong answer appears | Probe before confirming a misconception |
| MT-11 | Same misconception recurs | Increment recurrence and retain history |
| MT-12 | Clean verification closes a weakness | Link closure to passing evidence |
| MT-13 | Several reviews are due | Prioritize overdue prerequisites and high-impact weaknesses |
| MT-14 | Review result is `fail` | Schedule immediate/short review and reopen attention |
| MT-15 | Project concerns current software | Use current primary documentation and record version/date |
| MT-16 | Sources conflict | Present the conflict and separate fact from inference |
| MT-17 | Professional research project | Require a decision artifact, source ledger, and challenge review |
| MT-18 | Progress report requested | Lead with outcomes, evidence, weaknesses, due reviews, and next milestone |

## Pass criteria

A case passes only when the response follows every required behavior that is relevant to the prompt. Polished prose cannot compensate for a broken gate. For state-changing cases, validate the resulting JSON with `scripts/learning_state.py validate`.

