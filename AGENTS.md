# RMS development handoff

## Start every session
1. Read RMS_PROJECT_STATE.md from branch docs/rms-project-state in rasulovr/nms-cloud-pro:
   https://github.com/rasulovr/nms-cloud-pro/blob/docs/rms-project-state/RMS_PROJECT_STATE.md
2. Read the relevant module file and docs/RMS_BUSINESS_RULES.md for affected behavior.
3. Verify current application branch/commit and any saved work before editing.
4. Do not use the application code snapshot in this documentation branch as the current base.
5. Do not request information or permission again if the exact needed facts/scope are already recorded.

## Preserve state
- Maintain separate STABLE, WORKING, ROLLBACK CANDIDATE and deployed checkpoints.
- Source completion, build success, deployment completion and user acceptance are distinct.
- Record unknown facts explicitly; do not infer deployment identity from a version label.
- Main is connected to Vercel. Do not merge documentation into main merely to publish this handoff.
- This file defines a workflow, not a grant of additional permissions.
- Do not weaken RLS, auth, licensing or tenant boundaries.
- Preserve full-file delivery preference for requested RMS frontend replacement files.
- Never put credentials, session data, user personal records or business exports in public Git.

## End every substantial task
Update the canonical documentation branch:
- RMS_PROJECT_STATE.md: current task, exact code ref, status, verification, blocker, next action.
- Relevant module: implementation detail and limited, factual test evidence.
- RMS_CHANGELOG.md: dated entry with code ref and result.
- RMS_DATABASE.md for schema/RPC/RLS work: exact migration, target, applied/pending and verification.
- RMS_TODO.md: close only verified work and maintain priorities.
Keep root state 100–300 lines. Save intermediate work durably before a session ends.
For incomplete work record branch/commit or artifact, changed files, last completed step, next command/action.
Read the remote docs head before updating. Use non-force updates and preserve concurrent edits.
If saving fails, explicitly say the remote handoff is stale; do not claim synchronization.

