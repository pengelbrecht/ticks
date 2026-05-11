# Run Results Template

Use this template to record the outcome of a tickflow parallel approvals dogfood run.

## Run Metadata

- **Run ID:** `<run-id>`
- **Date / time started:** `<YYYY-MM-DD HH:MM TZ>`
- **Date / time completed:** `<YYYY-MM-DD HH:MM TZ>`
- **Coordinator / operator:** `<name>`
- **Source branch / commit:** `<branch-or-sha>`
- **Tick IDs included:** `<tick-id-1>, <tick-id-2>, ...`
- **Agent count:** `<number>`
- **Worktree paths:**
  - `<tick-id>`: `<absolute-or-relative-worktree-path>`
  - `<tick-id>`: `<absolute-or-relative-worktree-path>`
- **Shared resources used:** `<dev servers, databases, external services, or none>`
- **Notes:** `<run setup notes>`

## Wave Summary

| Wave | Tick IDs | Agent Count | Started | Finished | Duration | Result | Notes |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| `<wave-1>` | `<ids>` | `<n>` | `<time>` | `<time>` | `<duration>` | `<completed/partial/failed>` | `<notes>` |
| `<wave-2>` | `<ids>` | `<n>` | `<time>` | `<time>` | `<duration>` | `<completed/partial/failed>` | `<notes>` |

### Timing Details

- **Queue / setup time:** `<duration>`
- **Implementation time:** `<duration>`
- **Review / approval time:** `<duration>`
- **Merge / cleanup time:** `<duration>`
- **Total elapsed time:** `<duration>`

## Approval Outcomes

| Tick ID | Agent | Approval Required? | Approval Request | Outcome | Approved By | Timestamp | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `<tick-id>` | `<agent-id>` | `<yes/no>` | `<request summary or n/a>` | `<approved/rejected/not requested/timed out>` | `<name or n/a>` | `<time>` | `<notes>` |
| `<tick-id>` | `<agent-id>` | `<yes/no>` | `<request summary or n/a>` | `<approved/rejected/not requested/timed out>` | `<name or n/a>` | `<time>` | `<notes>` |

### Failures and Incidents

| Tick ID / Area | Failure Type | Symptoms | Root Cause | Resolution | Follow-up Needed? |
| --- | --- | --- | --- | --- | --- |
| `<tick-id-or-area>` | `<test/build/approval/tooling/merge/other>` | `<what happened>` | `<known or unknown>` | `<fix or mitigation>` | `<yes/no>` |

## Follow-up Issues

| Issue ID | Title | Priority | Owner | Discovered From | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `<issue-id-or-tbd>` | `<follow-up title>` | `<p0-p4>` | `<owner>` | `<run-id or tick-id>` | `<open/in progress/closed>` | `<notes>` |

### Open Questions

- `<question or decision needed>`
- `<question or decision needed>`
