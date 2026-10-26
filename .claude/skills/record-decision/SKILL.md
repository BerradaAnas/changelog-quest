---

name: record-decision
description: Record an architecture or data-model decision and keep the design docs in sync. Use when a change alters schemas, content rules, pipeline behaviour, stack, hosting, or anything stated in docs/conception.md.
---

# Record a decision

`docs/conception.md` (design), `docs/architecture.md` (how parts connect) and `schemas/src/`
(the data model) must agree. A decision record explains every change between them.

1. Add `docs/decisions/NNNN-short-title.md` with the next number, using the template in
   `docs/decisions/README.md`. Date it with today's date. Keep it short: context, decision,
   consequences.
2. If it replaces an earlier record, set that record's status to `Superseded by NNNN`.
   Never delete or renumber records.
3. Update in the same change:
   - `docs/conception.md`: the affected sections (data model, rules, stack, build plan, open
     decisions). Reference the record as "(ADR NNNN)".
   - `docs/architecture.md`: packages, data flow, invariants or trust boundaries, if they changed.
   - `schemas/src/` and the validator, if the data model or a rule changed, with tests.
   - The relevant `CLAUDE.md` files and skills, if their instructions are now wrong.
4. Run `pnpm check`.
